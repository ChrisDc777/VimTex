import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

export const OPENCODE_ZEN_BASE_URL = "https://opencode.ai/zen/v1";

export function createOpenRouterModel(
  modelId: string,
  apiKey: string,
  opts: { appName: string; appUrl: string },
): LanguageModel {
  const provider = createOpenRouter({
    apiKey,
    appName: opts.appName,
    appUrl: opts.appUrl,
  });
  return provider.chat(modelId);
}

export function createOpenCodeModel(
  modelId: string,
  apiKey: string,
): LanguageModel {
  const provider = createOpenAICompatible({
    name: "opencode",
    apiKey,
    baseURL: OPENCODE_ZEN_BASE_URL,
  });
  return provider.chatModel(modelId);
}
