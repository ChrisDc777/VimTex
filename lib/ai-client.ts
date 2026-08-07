import { loadUserAiKey } from "@/lib/ai-keys";
import type { EditorCaret } from "@/lib/ai-chat-context";

export type AiChatRequest = {
  instruction: string;
  document: string;
  model: string;
  signal?: AbortSignal;
  selection?: string;
  surrounding?: string;
  caret?: EditorCaret;
  truncated?: boolean;
};

export type AiChatResult = {
  message: string;
  model: string;
  provider: string;
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
  stream,
}: AiChatRequest & { stream?: boolean }) {
  return {
    instruction,
    document,
    model,
    apiKey: loadUserAiKey() || undefined,
    ...(selection ? { selection } : {}),
    ...(surrounding ? { surrounding } : {}),
    ...(caret ? { caret } : {}),
    ...(truncated ? { truncated: true } : {}),
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
  };
}

/**
 * Streaming chat (#29). Reads a plain text token stream from `/api/chat`.
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
    handlers.onToken?.(accumulated);
  }
  accumulated += decoder.decode();

  if (!accumulated.trim()) {
    throw new Error("Model returned an empty reply.");
  }

  return {
    message: accumulated,
    model: res.headers.get("X-Vimtex-Model") || req.model,
    provider: res.headers.get("X-Vimtex-Provider") || "openrouter",
  };
}
