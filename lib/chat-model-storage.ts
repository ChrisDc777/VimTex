import {
  DEFAULT_AI_MODEL,
  isValidModelId,
  CUSTOM_MODEL_PATTERN,
  type AiModelId,
} from "@/lib/ai-providers";

const STORAGE_KEY = "vimtex:chat-model";

export function loadChatModel(): AiModelId {
  if (typeof window === "undefined") return DEFAULT_AI_MODEL;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_MODEL;
    // Drop removed free-tier ids (e.g. tencent/hy3:free) back to default.
    if (isValidModelId(raw)) return raw;
    if (CUSTOM_MODEL_PATTERN.test(raw) && !raw.includes(":free")) return raw;
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
