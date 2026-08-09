import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aiFeatureEnabled,
  aiMayMutateDocument,
  aiFeaturesForShell,
} from "./ai-features.ts";

describe("ai-features gate", () => {
  it("enables chat on both shells", () => {
    assert.equal(aiFeatureEnabled("studio", "chat"), true);
    assert.equal(aiFeatureEnabled("forge", "chat"), true);
  });

  it("allows document mutation only on Studio", () => {
    assert.equal(aiMayMutateDocument("studio"), true);
    assert.equal(aiMayMutateDocument("forge"), false);
    assert.equal(aiFeatureEnabled("forge", "chatDocumentEdit"), false);
    assert.equal(aiFeatureEnabled("forge", "diffAcceptReject"), false);
  });

  it("enables diff accept/reject on Studio only", () => {
    assert.equal(aiFeatureEnabled("studio", "diffAcceptReject"), true);
    assert.equal(aiFeatureEnabled("forge", "diffAcceptReject"), false);
  });

  it("keeps Forge suggest-only (no inline / slash / ghost)", () => {
    for (const feature of [
      "ghostText",
      "slashCommands",
      "selectionActions",
      "chatDocActions",
      "templatesGen",
      "diagnosticsFix",
      "chatMemory",
      "outlineTodo",
      "grammarReview",
      "citeComplete",
    ]) {
      assert.equal(aiFeatureEnabled("forge", feature), false);
    }
  });

  it("enables cite completion on Studio only", () => {
    assert.equal(aiFeatureEnabled("studio", "citeComplete"), true);
    assert.equal(aiFeatureEnabled("forge", "citeComplete"), false);
  });

  it("enables outline + TODO scan on Studio only", () => {
    assert.equal(aiFeatureEnabled("studio", "outlineTodo"), true);
    assert.equal(aiFeatureEnabled("forge", "outlineTodo"), false);
  });

  it("enables grammar review on Studio only", () => {
    assert.equal(aiFeatureEnabled("studio", "grammarReview"), true);
    assert.equal(aiFeatureEnabled("forge", "grammarReview"), false);
  });

  it("allows diagnostics explain on Forge", () => {
    assert.equal(aiFeatureEnabled("forge", "diagnosticsExplain"), true);
  });

  it("enables chat memory only on Studio", () => {
    assert.equal(aiFeatureEnabled("studio", "chatMemory"), true);
    assert.equal(aiFeatureEnabled("forge", "chatMemory"), false);
  });

  it("returns a non-empty studio set", () => {
    assert.ok(aiFeaturesForShell("studio").size > aiFeaturesForShell("forge").size);
  });
});
