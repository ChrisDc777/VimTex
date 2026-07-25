import {
  DEFAULT_AI_MODEL,
  isAiModelId,
  type AiModelId,
} from "@/lib/ai-models";

const STORAGE_KEY = "vimtex:chat-model";

export function loadChatModel(): AiModelId {
  if (typeof window === "undefined") return DEFAULT_AI_MODEL;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && isAiModelId(raw)) return raw;
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
