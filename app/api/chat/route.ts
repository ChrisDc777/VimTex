import { generateText, streamText } from "ai";
import { buildSystemPrompt } from "@/lib/ai-chat";
import { isDerivationCoachInstruction } from "@/lib/derivation-coach";
import {
  type AiHistoryMessage,
  DEFAULT_HISTORY_MAX_CHARS,
  DEFAULT_HISTORY_MAX_MESSAGES,
  MAX_HISTORY_MESSAGE_CHARS,
  trimAiHistory,
} from "@/lib/ai-chat-history";
import { createOpenCodeModel, createOpenRouterModel } from "@/lib/ai-backend";
import { formatAiError } from "@/lib/ai-errors";
import {
  CUSTOM_MODEL_PATTERN,
  DEFAULT_AI_MODEL,
  backendForModel,
  isServerKeyedModel,
  providerForModel,
} from "@/lib/ai-providers";
import {
  formatAiUsageTrailer,
  normalizeAiUsage,
  type AiKeySource,
} from "@/lib/ai-usage";
import {
  DEFAULT_AI_TEMPERATURE,
  normalizeAiTemperature,
} from "@/lib/ai-room-prefs";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 512 * 1024;
/** Soft ceilings — large enough for real notes; still guard the process. */
const MAX_INSTRUCTION_CHARS = 12_000;
const MAX_DOCUMENT_CHARS = 400_000;
const MAX_SELECTION_CHARS = 32_000;
const MAX_SURROUNDING_CHARS = 16_000;
const MAX_DIAGNOSTICS_CHARS = 4_000;
const MAX_OUTLINE_CHARS = 4_000;
const MAX_CITATIONS_CHARS = 2_000;

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
  /** Prior @vimothy turns (#54 Level A). */
  history?: unknown;
  /** Chat-only derivation coach (#84). */
  mode?: "coach" | string;
  /** Sampling temperature 0–1 (#60). */
  temperature?: number;
  /** #57 Level C auxiliary context (Studio). */
  diagnostics?: string;
  outline?: string;
  citations?: string;
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

function parseHistory(value: unknown): AiHistoryMessage[] {
  if (!Array.isArray(value)) return [];
  const out: AiHistoryMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string" || !content.trim()) continue;
    out.push({
      role,
      content: content.trim().slice(0, MAX_HISTORY_MESSAGE_CHARS),
    });
  }
  return trimAiHistory(out, {
    maxMessages: DEFAULT_HISTORY_MAX_MESSAGES,
    maxChars: DEFAULT_HISTORY_MAX_CHARS,
  });
}

function parseBody(body: ChatRequestBody): {
  instruction: string;
  document: string;
  model: string;
  apiKey: string;
  keySource?: AiKeySource;
  providerLabel: string;
  stream: boolean;
  selection?: string;
  surrounding?: string;
  caret?: { line: number; column: number; offset: number };
  truncated: boolean;
  history: AiHistoryMessage[];
  coach?: boolean;
  ask?: boolean;
  temperature?: number;
  diagnostics?: string;
  outline?: string;
  citations?: string;
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
      history: [],
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
      history: [],
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
      history: [],
      error: Response.json({ error: "document too long." }, { status: 400 }),
    };
  }

  const model =
    typeof body.model === "string" && CUSTOM_MODEL_PATTERN.test(body.model)
      ? body.model
      : DEFAULT_AI_MODEL;

  const userKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const meta = providerForModel(model);
  const backend = backendForModel(model);
  const serverKeyed = isServerKeyedModel(model);

  if (!serverKeyed && !userKey) {
    return {
      instruction: "",
      document: "",
      model: "",
      apiKey: "",
      providerLabel: "",
      stream: false,
      truncated: false,
      history: [],
      error: Response.json(
        {
          error:
            backend === "opencode"
              ? "This model requires an OpenCode API key. Add one in the model picker."
              : "This model requires your own OpenRouter API key. Add one in the model picker.",
        },
        { status: 400 },
      ),
    };
  }

  const serverKey =
    backend === "opencode"
      ? (process.env.OPENCODE_API_KEY?.trim() ?? "")
      : (process.env.OPENROUTER_API_KEY?.trim() ?? "");

  // Prefer the user's key when present (metered BYOK / avoids shared free-tier
  // rate limits). Fall back to the server key for free/registry models.
  // Never cross-wire OpenRouter ↔ OpenCode keys.
  const keySource: AiKeySource = userKey
    ? "user"
    : serverKeyed
      ? "server"
      : "user";
  const apiKey = userKey || (serverKeyed ? serverKey : "");
  if (!apiKey) {
    const hint =
      backend === "opencode"
        ? "No OpenCode API key configured. Set OPENCODE_API_KEY or add your key in the model picker."
        : "No AI API key configured. Set OPENROUTER_API_KEY or add your own key in the model picker.";
    return {
      instruction: "",
      document: "",
      model: "",
      apiKey: "",
      providerLabel: "",
      stream: false,
      truncated: false,
      history: [],
      error: Response.json({ error: hint }, { status: 500 }),
    };
  }

  return {
    instruction,
    document,
    model,
    apiKey,
    keySource,
    providerLabel: meta.id,
    stream: Boolean(body.stream),
    selection: parseOptionalString(body.selection, MAX_SELECTION_CHARS),
    surrounding: parseOptionalString(body.surrounding, MAX_SURROUNDING_CHARS),
    caret: parseCaret(body.caret),
    truncated: Boolean(body.truncated),
    history: parseHistory(body.history),
    coach:
      body.mode === "coach" || isDerivationCoachInstruction(instruction),
    ask: body.mode === "ask",
    temperature:
      normalizeAiTemperature(body.temperature) ?? DEFAULT_AI_TEMPERATURE,
    diagnostics: parseOptionalString(body.diagnostics, MAX_DIAGNOSTICS_CHARS),
    outline: parseOptionalString(body.outline, MAX_OUTLINE_CHARS),
    citations: parseOptionalString(body.citations, MAX_CITATIONS_CHARS),
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
    keySource,
    providerLabel,
    stream,
    selection,
    surrounding,
    caret,
    truncated,
    history,
    coach,
    ask,
    temperature = DEFAULT_AI_TEMPERATURE,
    diagnostics,
    outline,
    citations,
  } = parsed;

  const lm =
    backendForModel(model) === "opencode"
      ? createOpenCodeModel(model, apiKey)
      : createOpenRouterModel(model, apiKey, {
          appName: "VimTex",
          appUrl: appUrl(),
        });

  const system = buildSystemPrompt({
    document,
    selection,
    surrounding,
    caret,
    truncated,
    diagnostics,
    outline,
    citations,
    coach: Boolean(coach),
    ask: Boolean(ask) && !coach,
  });

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: instruction },
  ];

  const keyHeader = keySource ?? "server";

  try {
    if (stream) {
      const result = streamText({
        model: lm,
        system,
        messages,
        temperature,
        abortSignal: req.signal,
      });

      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of result.textStream) {
              controller.enqueue(encoder.encode(chunk));
            }
            // Best-effort usage for shared + BYOK keys. Missing/failed usage
            // must never fail the reply.
            try {
              const usage = normalizeAiUsage(await result.usage);
              if (usage) {
                controller.enqueue(
                  encoder.encode(formatAiUsageTrailer(usage)),
                );
              }
            } catch {
              // ignore
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(body, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Vimtex-Model": model,
          "X-Vimtex-Provider": providerLabel,
          "X-Vimtex-Key": keyHeader,
        },
      });
    }

    const { text, usage: rawUsage } = await generateText({
      model: lm,
      system,
      messages,
      temperature,
      abortSignal: req.signal,
    });

    if (!text || !text.trim()) {
      return Response.json(
        { error: "Model returned an empty reply." },
        { status: 502 },
      );
    }

    let usage = null;
    try {
      usage = normalizeAiUsage(rawUsage);
    } catch {
      usage = null;
    }
    return Response.json({
      message: text,
      model,
      provider: providerLabel,
      keySource: keyHeader,
      ...(usage ? { usage } : {}),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    const detail = err instanceof Error ? err.message : "AI request failed";
    const modelLabel =
      // Avoid circular UI imports — label is best-effort from the slug.
      model.includes("/")
        ? model.split("/").pop()?.split(":")[0] || model
        : model;
    return Response.json(
      { error: formatAiError(detail, { model, modelLabel }) },
      { status: 502 },
    );
  }
}
