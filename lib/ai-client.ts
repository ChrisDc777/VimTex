import { loadUserAiKey } from "@/lib/ai-keys";

export type AiChatRequest = {
  instruction: string;
  document: string;
  model: string;
};

export type AiChatResult = {
  message: string;
  model: string;
  provider: string;
};

export async function postAiChat({
  instruction,
  document,
  model,
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
