import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_AI_MODEL,
  backendForModel,
  isServerKeyedModel,
  isValidModelId,
  providerForModel,
} from "./ai-providers.ts";

test("default model is a live OpenRouter free slug", () => {
  assert.ok(DEFAULT_AI_MODEL.endsWith(":free"));
  assert.equal(isValidModelId(DEFAULT_AI_MODEL), true);
  assert.equal(backendForModel(DEFAULT_AI_MODEL), "openrouter");
  assert.equal(isServerKeyedModel(DEFAULT_AI_MODEL), true);
});

test("removed hy3 is no longer valid", () => {
  assert.equal(isValidModelId("tencent/hy3:free"), false);
});

test("OpenCode free models use opencode backend", () => {
  assert.equal(backendForModel("deepseek-v4-flash-free"), "opencode");
  assert.equal(providerForModel("deepseek-v4-flash-free").id, "opencode");
  assert.equal(isServerKeyedModel("deepseek-v4-flash-free"), true);
});

test("BYOK models require user key source", () => {
  assert.equal(providerForModel("openai/gpt-4o-mini").keySource, "user");
  assert.equal(isServerKeyedModel("openai/gpt-4o-mini"), false);
});
