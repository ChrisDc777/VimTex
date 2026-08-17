import { isServerKeyedModel } from "@/lib/ai-providers";

export type AiAdmitResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function admissionOrigin(): string | null {
  const origin =
    process.env.AI_ADMISSION_ORIGIN?.replace(/\/$/, "") ||
    process.env.ROOM_SERVICE_ORIGIN?.replace(/\/$/, "") ||
    "";
  return origin || null;
}

function shouldBypassAdmission(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.AI_ADMISSION_BYPASS === "1") return true;
  return !admissionOrigin() || !process.env.AI_ADMISSION_SECRET;
}

export async function admitServerAi(opts: {
  model: string;
  userApiKey?: string;
  turnstileToken?: string;
  clientIp: string;
}): Promise<AiAdmitResult> {
  if (opts.userApiKey?.trim()) return { ok: true };
  if (!isServerKeyedModel(opts.model)) return { ok: true };
  if (shouldBypassAdmission()) return { ok: true };

  const origin = admissionOrigin();
  const secret = process.env.AI_ADMISSION_SECRET?.trim();
  if (!origin || !secret) {
    return {
      ok: false,
      status: 503,
      error: "Shared AI is not available. Add your own API key to continue.",
    };
  }
  if (!opts.turnstileToken?.trim()) {
    return {
      ok: false,
      status: 403,
      error:
        "Human verification required for shared AI. Complete the check or add your own key.",
    };
  }

  try {
    const res = await fetch(`${origin}/internal/ai/admit`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-vimtex-internal": secret,
      },
      body: JSON.stringify({
        token: opts.turnstileToken,
        ip: opts.clientIp,
      }),
    });
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      ok?: boolean;
    } | null;
    if (!res.ok || !body?.ok) {
      return {
        ok: false,
        status: res.status === 429 ? 429 : res.status === 403 ? 403 : 503,
        error:
          body?.error ||
          "Shared AI was refused. Add your own API key (BYOK) to continue.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      status: 503,
      error:
        "Could not reach AI admission. Add your own API key or try again.",
    };
  }
}
