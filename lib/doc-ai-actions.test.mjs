import assert from "node:assert/strict";
import test from "node:test";
import {
  DOC_AI_ACTIONS,
  filterDocAiActions,
} from "./doc-ai-actions.ts";
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

test("chat slash menu keeps core commands without templates", () => {
  const all = filterSlashCommands("", SLASH_COMMANDS, { includeTemplates: true });
  const noTpl = filterSlashCommands("", SLASH_COMMANDS, {
    includeTemplates: false,
  });
  assert.ok(all.some((c) => c.id === "explain"));
  assert.ok(noTpl.some((c) => c.id === "explain"));
  assert.ok(!all.some((c) => c.id === "letter"));
});

test("review doc action prefers patch and is gated", () => {
  const action = DOC_AI_ACTIONS.find((a) => a.id === "review");
  assert.ok(action);
  assert.equal(action.grammarReview, true);
  const instr = action.buildInstruction("");
  assert.match(instr, /entire note/i);
  assert.match(instr, /@@@PATCH/);

  const filtered = filterDocAiActions(DOC_AI_ACTIONS, {
    includeGrammarReview: false,
  });
  assert.ok(!filtered.some((a) => a.id === "review"));
});
