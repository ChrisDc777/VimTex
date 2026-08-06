import { loadUserAiKey } from "@/lib/ai-keys";

export type AiChatRequest = {
  instruction: string;
  document: string;
  model: string;
  signal?: AbortSignal;
};

export type AiChatResult = {
  message: string;
  model: string;
  provider: string;
};

export type AiChatStreamHandlers = {
  onToken?: (accumulated: string) => void;
};

/**
 * Non-streaming chat (JSON). Kept for callers that do not need tokens.
 */
export async function postAiChat({
  instruction,
  document,
  model,
  signal,
}: AiChatRequest): Promise<AiChatResult> {
  const userKey = loadUserAiKey();
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instruction,
      document,
      model,
      apiKey: userKey || undefined,
    }),
    signal,
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
  { instruction, document, model, signal }: AiChatRequest,
  handlers: AiChatStreamHandlers = {},
): Promise<AiChatResult> {
  const userKey = loadUserAiKey();
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instruction,
      document,
      model,
      apiKey: userKey || undefined,
      stream: true,
    }),
    signal,
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
    model: res.headers.get("X-Vimtex-Model") || model,
    provider: res.headers.get("X-Vimtex-Provider") || "openrouter",
  };
}
