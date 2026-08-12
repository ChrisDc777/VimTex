import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSystemPrompt } from "./ai-chat.ts";

describe("buildSystemPrompt ask mode (#129)", () => {
  it("forbids patch markers in Ask mode", () => {
    const prompt = buildSystemPrompt({
      document: "x = 1",
      ask: true,
    });
    assert.match(prompt, /Ask mode/i);
    assert.match(prompt, /Never emit @@@PATCH/i);
    assert.equal(prompt.includes("@@@DOCUMENT"), true); // mentioned as forbidden
    assert.equal(prompt.includes("prefer a ranged patch"), false);
  });

  it("keeps patch instructions in Edit (default) mode", () => {
    const prompt = buildSystemPrompt({ document: "x = 1" });
    assert.match(prompt, /ranged patch/i);
    assert.equal(prompt.includes("Ask mode"), false);
  });

  it("coach takes precedence over ask", () => {
    const prompt = buildSystemPrompt({
      document: "x = 1",
      ask: true,
      coach: true,
    });
    assert.match(prompt, /Derivation-coach|step-by-step/i);
    assert.equal(prompt.includes("Ask mode"), false);
  });
});
