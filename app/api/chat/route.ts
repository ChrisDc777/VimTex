import { generateText, streamText } from "ai";
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
const MAX_SELECTION_CHARS = 8_000;
const MAX_SURROUNDING_CHARS = 4_000;

type ChatRequestBody = {
  instruction?: string;
  document?: string;
  model?: string;
  apiKey?: string;
  /** When true, respond with a plain text token stream (#29). */
  stream?: boolean;
  selection?: string;
  surrounding?: string;
  caret?: { line?: number; column?: number; offset?: number };
  truncated?: boolean;
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

function parseOptionalString(
  value: unknown,
  max: number,
): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

function parseCaret(
  value: ChatRequestBody["caret"],
): { line: number; column: number; offset: number } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const line = Number(value.line);
  const column = Number(value.column);
  const offset = Number(value.offset);
  if (
    !Number.isFinite(line) ||
    !Number.isFinite(column) ||
    !Number.isFinite(offset)
  ) {
    return undefined;
  }
  return {
    line: Math.max(1, Math.floor(line)),
    column: Math.max(1, Math.floor(column)),
    offset: Math.max(0, Math.floor(offset)),
  };
}

function parseBody(body: ChatRequestBody): {
  instruction: string;
  document: string;
  model: string;
  apiKey: string;
  providerLabel: string;
  stream: boolean;
  selection?: string;
  surrounding?: string;
  caret?: { line: number; column: number; offset: number };
  truncated: boolean;
  error?: Response;
} {
  const instruction =
    typeof body.instruction === "string" ? body.instruction.trim() : "";
  if (!instruction) {
    return {
      instruction: "",
      document: "",
      model: "",
      apiKey: "",
      providerLabel: "",
      stream: false,
      truncated: false,
      error: Response.json(
        { error: "instruction must be a non-empty string." },
        { status: 400 },
      ),
    };
  }
  if (instruction.length > MAX_INSTRUCTION_CHARS) {
    return {
      instruction: "",
      document: "",
      model: "",
      apiKey: "",
      providerLabel: "",
      stream: false,
      truncated: false,
      error: Response.json({ error: "instruction too long." }, { status: 400 }),
    };
  }

  const document = typeof body.document === "string" ? body.document : "";
  if (document.length > MAX_DOCUMENT_CHARS) {
    return {
      instruction: "",
      document: "",
      model: "",
      apiKey: "",
      providerLabel: "",
      stream: false,
      truncated: false,
      error: Response.json({ error: "document too long." }, { status: 400 }),
    };
  }

  const model =
    typeof body.model === "string" && CUSTOM_MODEL_PATTERN.test(body.model)
      ? body.model
      : DEFAULT_AI_MODEL;

  const userKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

  if (!isFreeModel(model) && !userKey) {
    return {
      instruction: "",
      document: "",
      model: "",
      apiKey: "",
      providerLabel: "",
      stream: false,
      truncated: false,
      error: Response.json(
        {
          error:
            "This model requires your own OpenRouter API key. Add one in the model picker.",
        },
        { status: 400 },
      ),
    };
  }

  const serverKey = process.env.OPENROUTER_API_KEY?.trim() ?? "";
  const apiKey = userKey || serverKey;
  if (!apiKey) {
    return {
      instruction: "",
      document: "",
      model: "",
      apiKey: "",
      providerLabel: "",
      stream: false,
      truncated: false,
      error: Response.json(
        {
          error:
            "No AI API key configured. Set OPENROUTER_API_KEY or add your own key in the model picker.",
        },
        { status: 500 },
      ),
    };
  }

  return {
    instruction,
    document,
    model,
    apiKey,
    providerLabel: isFreeModel(model) ? "openrouter" : "byok-openrouter",
    stream: Boolean(body.stream),
    selection: parseOptionalString(body.selection, MAX_SELECTION_CHARS),
    surrounding: parseOptionalString(body.surrounding, MAX_SURROUNDING_CHARS),
    caret: parseCaret(body.caret),
    truncated: Boolean(body.truncated),
  };
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

  const parsed = parseBody(body);
  if (parsed.error) return parsed.error;

  const {
    instruction,
    document,
    model,
    apiKey,
    providerLabel,
    stream,
    selection,
    surrounding,
    caret,
    truncated,
  } = parsed;

  const provider = createOpenRouter({
    apiKey,
    appName: "VimTex",
    appUrl: appUrl(),
  });

  const system = buildSystemPrompt({
    document,
    selection,
    surrounding,
    caret,
    truncated,
  });

  try {
    if (stream) {
      const result = streamText({
        model: provider.chat(model),
        system,
        prompt: instruction,
        temperature: 0.4,
        abortSignal: req.signal,
      });

      return result.toTextStreamResponse({
        headers: {
          "X-Vimtex-Model": model,
          "X-Vimtex-Provider": providerLabel,
        },
      });
    }

    const { text } = await generateText({
      model: provider.chat(model),
      system,
      prompt: instruction,
      temperature: 0.4,
      abortSignal: req.signal,
    });

    if (!text || !text.trim()) {
      return Response.json(
        { error: "Model returned an empty reply." },
        { status: 502 },
      );
    }

    return Response.json({
      message: text,
      model,
      provider: providerLabel,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    const detail = err instanceof Error ? err.message : "AI request failed";
    return Response.json({ error: detail }, { status: 502 });
  }
}
