import {
  normalizeAiTemperature,
} from "@/lib/ai-room-prefs";
import { loadUserAiKey } from "@/lib/ai-keys";
import type { EditorCaret } from "@/lib/ai-chat-context";
import type { AiHistoryMessage } from "@/lib/ai-chat-history";
import { backendForModel } from "@/lib/ai-providers";
import {
  normalizeAiUsage,
  stripAiUsageTrailer,
  type AiKeySource,
  type AiTokenUsage,
} from "@/lib/ai-usage";

export type AiChatRequest = {
  instruction: string;
  document: string;
  model: string;
  signal?: AbortSignal;
  selection?: string;
  surrounding?: string;
  caret?: EditorCaret;
  truncated?: boolean;
  /** Prior @vimothy turns (#54). */
  history?: AiHistoryMessage[];
  /** Chat-only derivation coach (#84). Ask mode (#129). */
  mode?: "coach" | "ask" | "edit";
  /** Sampling temperature 0–1 (#60). */
  temperature?: number;
  /** #57 Level C — Studio auxiliary context. */
  diagnostics?: string;
  outline?: string;
  citations?: string;
};

export type AiChatResult = {
  message: string;
  model: string;
  provider: string;
  keySource?: AiKeySource;
  usage?: AiTokenUsage | null;
};

export type AiChatStreamHandlers = {
  onToken?: (accumulated: string) => void;
};

function requestBody({
  instruction,
  document,
  model,
  selection,
  surrounding,
  caret,
  truncated,
  history,
  mode,
  temperature,
  diagnostics,
  outline,
  citations,
  stream,
}: AiChatRequest & { stream?: boolean }) {
  const backend = backendForModel(model);
  const apiKey = loadUserAiKey(backend) || undefined;
  const temp = normalizeAiTemperature(temperature);
  return {
    instruction,
    document,
    model,
    apiKey,
    ...(selection ? { selection } : {}),
    ...(surrounding ? { surrounding } : {}),
    ...(caret ? { caret } : {}),
    ...(truncated ? { truncated: true } : {}),
    ...(history && history.length > 0 ? { history } : {}),
    ...(mode ? { mode } : {}),
    ...(temp !== undefined ? { temperature: temp } : {}),
    ...(diagnostics ? { diagnostics } : {}),
    ...(outline ? { outline } : {}),
    ...(citations ? { citations } : {}),
    ...(stream ? { stream: true } : {}),
  };
}

/**
 * Non-streaming chat (JSON). Kept for callers that do not need tokens.
 */
export async function postAiChat(req: AiChatRequest): Promise<AiChatResult> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody(req)),
    signal: req.signal,
  });

  let data: AiChatResult & { error?: string };
  try {
    data = (await res.json()) as AiChatResult & { error?: string };
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }

  if (!res.ok || data.error) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return {
    message: data.message,
    model: data.model,
    provider: data.provider,
    keySource: data.keySource,
    usage: normalizeAiUsage(data.usage),
  };
}

/**
 * Streaming chat (#29). Reads a plain text token stream from `/api/chat`.
 * Usage may arrive as a trailing `@@@VIMTEX_USAGE` line (#60).
 */
export async function streamAiChat(
  req: AiChatRequest,
  handlers: AiChatStreamHandlers = {},
): Promise<AiChatResult> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody({ ...req, stream: true })),
    signal: req.signal,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) detail = data.error;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  if (!res.body) {
    throw new Error("Streaming response had no body.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
    const live = stripAiUsageTrailer(accumulated).message;
    handlers.onToken?.(live);
  }
  accumulated += decoder.decode();

  const { message, usage } = stripAiUsageTrailer(accumulated);
  if (!message.trim()) {
    throw new Error("Model returned an empty reply.");
  }

  const keyHeader = res.headers.get("X-Vimtex-Key");
  const keySource: AiKeySource | undefined =
    keyHeader === "user" || keyHeader === "server" ? keyHeader : undefined;

  return {
    message,
    model: res.headers.get("X-Vimtex-Model") || req.model,
    provider: res.headers.get("X-Vimtex-Provider") || "openrouter",
    keySource,
    usage,
  };
}
