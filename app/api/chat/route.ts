import { buildSystemPrompt } from "@/lib/ai-chat";
import { DEFAULT_AI_MODEL, isAiModelId } from "@/lib/ai-models";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_INSTRUCTION_CHARS = 4_000;
const MAX_DOCUMENT_CHARS = 100_000;

type ChatRequestBody = {
  /** Preferred: single @ai instruction (no chat history). */
  instruction?: string;
  document?: string;
  model?: string;
};

type OpenRouterMessage = {
  role: string;
  content: string | null;
};

function appReferer(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://vimtex.local";
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "OPENROUTER_API_KEY is not set. Add it to .env or .env.local and restart the server.",
      },
      { status: 500 },
    );
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return Response.json({ error: "Request body too large." }, { status: 413 });
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const instruction =
    typeof body.instruction === "string" ? body.instruction.trim() : "";
  if (!instruction) {
    return Response.json(
      { error: "instruction must be a non-empty string." },
      { status: 400 },
    );
  }
  if (instruction.length > MAX_INSTRUCTION_CHARS) {
    return Response.json({ error: "instruction too long." }, { status: 400 });
  }

  const model =
    typeof body.model === "string" && isAiModelId(body.model)
      ? body.model
      : DEFAULT_AI_MODEL;

  const document = typeof body.document === "string" ? body.document : "";
  if (document.length > MAX_DOCUMENT_CHARS) {
    return Response.json({ error: "document too long." }, { status: 400 });
  }

  const openRouterMessages: OpenRouterMessage[] = [
    { role: "system", content: buildSystemPrompt(document) },
    { role: "user", content: instruction },
  ];

  let upstream: Response;
  try {
    upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": appReferer(),
        "X-Title": "VimTex",
      },
      body: JSON.stringify({
        model,
        messages: openRouterMessages,
        temperature: 0.4,
      }),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Network error";
    return Response.json(
      { error: `Failed to reach OpenRouter: ${detail}` },
      { status: 502 },
    );
  }

  const rawText = await upstream.text();
  let data: {
    choices?: { message?: { content?: string | null } }[];
    error?: { message?: string };
  };
  try {
    data = JSON.parse(rawText) as typeof data;
  } catch {
    return Response.json(
      {
        error: `OpenRouter returned non-JSON (${upstream.status}).`,
      },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const msg =
      data.error?.message ||
      `OpenRouter error ${upstream.status}`;
    return Response.json({ error: msg }, { status: 502 });
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    return Response.json(
      { error: "Model returned an empty reply." },
      { status: 502 },
    );
  }

  return Response.json({
    message: content,
    model,
  });
}
