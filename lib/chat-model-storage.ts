import {
  DEFAULT_AI_MODEL,
  isKnownOrCustomModelId,
  type AiModelId,
} from "@/lib/ai-providers";

const STORAGE_KEY = "vimtex:chat-model";

export function loadChatModel(): AiModelId {
  if (typeof window === "undefined") return DEFAULT_AI_MODEL;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && isKnownOrCustomModelId(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_AI_MODEL;
}

export function saveChatModel(model: AiModelId): void {
  try {
    localStorage.setItem(STORAGE_KEY, model);
  } catch {
    // ignore
  }
}
