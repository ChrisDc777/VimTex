import { createHash } from "node:crypto";
import { json } from "./cors";
import { logEvent } from "./constants";

const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function handleAiAdmit(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== "POST") {
    return json(env, request, { error: "Method not allowed." }, 405);
  }
  const secret = env.AI_ADMISSION_SECRET?.trim();
  if (!secret) {
    return json(env, request, { error: "Admission is not configured." }, 503);
  }
  const presented = request.headers.get("x-vimtex-internal")?.trim();
  if (!presented || presented !== secret) {
    return json(env, request, { error: "Unauthorized." }, 401);
  }

  let body: { token?: string; ip?: string };
  try {
    body = (await request.json()) as { token?: string; ip?: string };
  } catch {
    return json(env, request, { error: "Invalid JSON body." }, 400);
  }
  const token = body.token?.trim();
  const ip = body.ip?.trim() || "unknown";
  if (!token) {
    return json(env, request, { error: "Turnstile token required." }, 400);
  }

  const turnstileSecret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!turnstileSecret) {
    return json(env, request, { error: "Turnstile is not configured." }, 503);
  }

  const form = new FormData();
  form.set("secret", turnstileSecret);
  form.set("response", token);
  if (ip !== "unknown") form.set("remoteip", ip);
  const verifyRes = await fetch(TURNSTILE_VERIFY, { method: "POST", body: form });
  const verify = (await verifyRes.json().catch(() => null)) as {
    success?: boolean;
  } | null;
  if (!verify?.success) {
    logEvent("vimtex.ai.admit", { ok: false, reason: "turnstile" });
    return json(env, request, { error: "Human verification failed." }, 403);
  }

  if (env.AI_RATE_LIMITER) {
    const key = createHash("sha256").update(`ai:${ip}`, "utf8").digest("hex");
    const { success } = await env.AI_RATE_LIMITER.limit({ key });
    if (!success) {
      logEvent("vimtex.ai.admit", { ok: false, reason: "rate" });
      return json(
        env,
        request,
        {
          error:
            "Too many AI requests from this network. Add your own key (BYOK) or try later.",
        },
        429,
      );
    }
  }

  logEvent("vimtex.ai.admit", { ok: true });
  return json(env, request, { ok: true });
}
