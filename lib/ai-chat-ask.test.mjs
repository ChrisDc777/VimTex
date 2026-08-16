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

describe("parseAssistantReply orphan FIND", () => {
  it("parses a plain assistant message without patch markers", async () => {
    const { parseAssistantReply } = await import("./ai-chat.ts");
    const parsed = parseAssistantReply("Here is the explanation.");
    assert.equal(parsed.message, "Here is the explanation.");
    assert.equal(parsed.patch, null);
    assert.equal(parsed.documentEdit, null);
  });

  it("hides orphan FIND/THEN markers from the chat bubble", async () => {
    const { parseAssistantReply } = await import("./ai-chat.ts");
    const parsed = parseAssistantReply(`Sure.
@@@FIND
formula
@@@THEN
something
@@@END
`);
    assert.equal(parsed.message.includes("@@@FIND"), false);
    assert.equal(parsed.message.includes("@@@THEN"), false);
    assert.ok(parsed.patch);
    assert.equal(parsed.patch.hunks[0].find, "formula");
  });
});

describe("buildSystemPrompt plan mode", () => {
  it("forbids patches and asks for numbered steps", () => {
    const prompt = buildSystemPrompt({
      document: "x = 1",
      plan: true,
    });
    assert.match(prompt, /Plan mode/i);
    assert.match(prompt, /numbered steps/i);
    assert.match(prompt, /Never emit @@@PATCH/i);
    assert.equal(prompt.includes("prefer a ranged patch"), false);
    assert.equal(prompt.includes("Ask mode"), false);
  });

  it("coach takes precedence over plan", () => {
    const prompt = buildSystemPrompt({
      document: "x = 1",
      plan: true,
      coach: true,
    });
    assert.match(prompt, /Derivation-coach|step-by-step/i);
    assert.equal(prompt.includes("Plan mode"), false);
  });
});
