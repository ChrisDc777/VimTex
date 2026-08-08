import assert from "node:assert/strict";
import test from "node:test";
import { DOC_AI_ACTIONS } from "./doc-ai-actions.ts";
import { filterSlashCommands, SLASH_COMMANDS } from "./slash-commands.ts";

test("doc actions include fix-errors and add-abstract", () => {
  const ids = DOC_AI_ACTIONS.map((a) => a.id);
  assert.ok(ids.includes("fix-errors"));
  assert.ok(ids.includes("add-abstract"));
});

test("fix-errors instruction asks for a document edit", () => {
  const action = DOC_AI_ACTIONS.find((a) => a.id === "fix-errors");
  assert.ok(action);
  const instr = action.buildInstruction("");
  assert.match(instr, /Fix all KaTeX/);
  assert.match(instr, /full-document edit/i);
});

test("template slash commands filter with includeTemplates false", () => {
  const all = filterSlashCommands("", SLASH_COMMANDS, { includeTemplates: true });
  const noTpl = filterSlashCommands("", SLASH_COMMANDS, {
    includeTemplates: false,
  });
  assert.ok(all.some((c) => c.id === "letter"));
  assert.ok(!noTpl.some((c) => c.id === "letter"));
  assert.ok(noTpl.some((c) => c.id === "explain"));
});
