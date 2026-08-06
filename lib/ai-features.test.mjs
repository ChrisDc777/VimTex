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

  it("does not enable diff accept/reject until that feature ships", () => {
    // Wave A #27 flips this on for Studio when the UI lands.
    assert.equal(aiFeatureEnabled("studio", "diffAcceptReject"), false);
  });

  it("keeps Forge suggest-only (no inline / slash / ghost)", () => {
    for (const feature of [
      "ghostText",
      "slashCommands",
      "selectionActions",
      "chatDocActions",
      "templatesGen",
      "diagnosticsFix",
    ]) {
      assert.equal(aiFeatureEnabled("forge", feature), false);
    }
  });

  it("allows diagnostics explain on Forge", () => {
    assert.equal(aiFeatureEnabled("forge", "diagnosticsExplain"), true);
  });

  it("returns a non-empty studio set", () => {
    assert.ok(aiFeaturesForShell("studio").size > aiFeaturesForShell("forge").size);
  });
});
