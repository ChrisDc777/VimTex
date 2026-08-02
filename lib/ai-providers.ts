export type AiProviderId = "openrouter" | "byok-openrouter";

export type AiModel = {
  id: string;
  label: string;
  description?: string;
};

export type AiProvider = {
  id: AiProviderId;
  label: string;
  keySource: "server" | "user";
  keyHint: string;
  models: readonly AiModel[];
};

export type AiModelId = string;

export const AI_PROVIDERS: readonly AiProvider[] = [
  {
    id: "openrouter",
    label: "OpenRouter (shared)",
    keySource: "server",
    keyHint: "Free-tier models served with VimTex's shared key.",
    models: [
      {
        id: "tencent/hy3:free",
        label: "HY3",
        description: "Fast, general-purpose (free)",
      },
      {
        id: "nvidia/nemotron-3-ultra-550b-a55b:free",
        label: "Nemotron Ultra",
        description: "Larger reasoning model (free)",
      },
    ],
  },
  {
    id: "byok-openrouter",
    label: "OpenRouter (your key)",
    keySource: "user",
    keyHint:
      "Heavier models billed to your own OpenRouter key. Stored only in your browser.",
    models: [
      {
        id: "openai/gpt-4o-mini",
        label: "GPT-4o mini",
        description: "Fast and cheap (OpenAI)",
      },
      {
        id: "anthropic/claude-3.5-sonnet",
        label: "Claude 3.5 Sonnet",
        description: "Balanced reasoning (Anthropic)",
      },
      {
        id: "deepseek/deepseek-chat",
        label: "DeepSeek V3",
        description: "Strong at math (DeepSeek)",
      },
    ],
  },
];

export const DEFAULT_PROVIDER: AiProviderId = "openrouter";
export const DEFAULT_AI_MODEL: AiModelId = "tencent/hy3:free";

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
    AI_PROVIDERS.find((p) => p.id === DEFAULT_PROVIDER) ?? AI_PROVIDERS[0]
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

/** Model ids that may use the server's shared key. */
export function isFreeModel(model: string): boolean {
  return getAiProvider(DEFAULT_PROVIDER)?.models.some((m) => m.id === model) ?? false;
}
