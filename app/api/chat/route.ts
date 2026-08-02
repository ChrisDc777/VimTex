import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { buildSystemPrompt } from "@/lib/ai-chat";
import {
  CUSTOM_MODEL_PATTERN,
  DEFAULT_AI_MODEL,
  isFreeModel,
} from "@/lib/ai-providers";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_INSTRUCTION_CHARS = 4_000;
const MAX_DOCUMENT_CHARS = 100_000;

type ChatRequestBody = {
  instruction?: string;
  document?: string;
  model?: string;
  apiKey?: string;
};

function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://vimtex.local";
}

export async function POST(req: Request) {
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

  const document = typeof body.document === "string" ? body.document : "";
  if (document.length > MAX_DOCUMENT_CHARS) {
    return Response.json({ error: "document too long." }, { status: 400 });
  }

  const model =
    typeof body.model === "string" && CUSTOM_MODEL_PATTERN.test(body.model)
      ? body.model
      : DEFAULT_AI_MODEL;

  const userKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

  if (!isFreeModel(model) && !userKey) {
    return Response.json(
      {
        error:
          "This model requires your own OpenRouter API key. Add one in the model picker.",
      },
      { status: 400 },
    );
  }

  const serverKey = process.env.OPENROUTER_API_KEY?.trim() ?? "";
  const apiKey = userKey || serverKey;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "No AI API key configured. Set OPENROUTER_API_KEY or add your own key in the model picker.",
      },
      { status: 500 },
    );
  }

  const provider = createOpenRouter({
    apiKey,
    appName: "VimTex",
    appUrl: appUrl(),
  });

  try {
    const { text } = await generateText({
      model: provider.chat(model),
      system: buildSystemPrompt(document),
      prompt: instruction,
      temperature: 0.4,
    });

    if (!text || !text.trim()) {
      return Response.json({ error: "Model returned an empty reply." }, { status: 502 });
    }

    return Response.json({
      message: text,
      model,
      provider: isFreeModel(model) ? "openrouter" : "byok-openrouter",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "AI request failed";
    return Response.json({ error: detail }, { status: 502 });
  }
}
