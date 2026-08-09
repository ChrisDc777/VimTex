export type AiProviderId = "openrouter" | "opencode" | "byok-openrouter";

export type AiModel = {
  id: string;
  label: string;
};

export type AiProvider = {
  id: AiProviderId;
  label: string;
  keySource: "server" | "user";
  /** Which API backend this group talks to. */
  backend: "openrouter" | "opencode";
  keyHint: string;
  models: readonly AiModel[];
};

export type AiModelId = string;

/**
 * Curated free OpenRouter models (live `:free` slugs as of 2026-08).
 * Dead entries like `tencent/hy3:free` removed.
 */
const OPENROUTER_FREE_MODELS: readonly AiModel[] = [
  { id: "google/gemma-4-26b-a4b-it:free", label: "Gemma 4 26B" },
  { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B" },
  { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", label: "Nemotron Nano" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron Super" },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Nemotron Ultra",
  },
  { id: "cohere/north-mini-code:free", label: "North Mini Code" },
  { id: "inclusionai/ling-3.0-tiny:free", label: "Ling 3.0 Tiny" },
];

/** Free OpenCode Zen models (chat-completions). */
const OPENCODE_FREE_MODELS: readonly AiModel[] = [
  { id: "deepseek-v4-flash-free", label: "DeepSeek V4 Flash" },
  { id: "mimo-v2.5-free", label: "MiMo V2.5" },
  { id: "big-pickle", label: "Big Pickle" },
  { id: "north-mini-code-free", label: "North Mini Code" },
  { id: "nemotron-3-ultra-free", label: "Nemotron 3 Ultra" },
  { id: "laguna-s-2.1-free", label: "Laguna S 2.1" },
  { id: "longcat-2.0-free", label: "LongCat 2.0" },
  { id: "ling-3.0-tiny-free", label: "Ling 3.0 Tiny" },
  { id: "ling-3.0-flash-free", label: "Ling 3.0 Flash" },
];

export const AI_PROVIDERS: readonly AiProvider[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    keySource: "server",
    backend: "openrouter",
    keyHint: "Free models — your OpenRouter key preferred when set; else VimTex’s shared key. Usage shown when the provider reports it.",
    models: OPENROUTER_FREE_MODELS,
  },
  {
    id: "opencode",
    label: "OpenCode",
    keySource: "server",
    backend: "opencode",
    keyHint: "Free Zen models — your key preferred when set; else OPENCODE_API_KEY. Usage shown when reported.",
    models: OPENCODE_FREE_MODELS,
  },
  {
    id: "byok-openrouter",
    label: "Your key",
    keySource: "user",
    backend: "openrouter",
    keyHint: "Billed to your OpenRouter key; per-reply token usage when the provider reports it.",
    models: [
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini" },
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
      { id: "deepseek/deepseek-chat", label: "DeepSeek V3" },
    ],
  },
];

export const DEFAULT_PROVIDER: AiProviderId = "opencode";
export const DEFAULT_AI_MODEL: AiModelId = "deepseek-v4-flash-free";

export const CUSTOM_MODEL_PATTERN = /^[a-zA-Z0-9/._:-]{1,64}$/;

export function getAiProvider(id: string | undefined): AiProvider | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}

export function isAiProviderId(value: string): value is AiProviderId {
  return AI_PROVIDERS.some((p) => p.id === value);
}

export function providerForModel(model: string): AiProvider {
  const known = AI_PROVIDERS.find((p) => p.models.some((m) => m.id === model));
  if (known) return known;
  if (CUSTOM_MODEL_PATTERN.test(model)) {
    const byok = AI_PROVIDERS.find((p) => p.id === "byok-openrouter");
    if (byok) return byok;
  }
  return (
    AI_PROVIDERS.find((p) => p.id === DEFAULT_PROVIDER) ?? AI_PROVIDERS[0]!
  );
}

export function isUserKeyModel(model: string): boolean {
  return providerForModel(model).keySource === "user";
}

/** True for an id listed in the registry (free or curated BYOK models). */
export function isValidModelId(value: string): boolean {
  return AI_PROVIDERS.some((p) => p.models.some((m) => m.id === value));
}

/** True for a known model id or a well-formed custom OpenRouter slug. */
export function isKnownOrCustomModelId(value: string): boolean {
  return isValidModelId(value) || CUSTOM_MODEL_PATTERN.test(value);
}

/**
 * Models that may use a server shared key (OpenRouter or OpenCode free tiers).
 * @deprecated Prefer `isServerKeyedModel` — kept for existing call sites.
 */
export function isFreeModel(model: string): boolean {
  return isServerKeyedModel(model);
}

export function isServerKeyedModel(model: string): boolean {
  const known = AI_PROVIDERS.find((p) => p.models.some((m) => m.id === model));
  return known?.keySource === "server";
}

export function backendForModel(
  model: string,
): "openrouter" | "opencode" {
  return providerForModel(model).backend;
}
