import assert from "node:assert/strict";
import test from "node:test";
import {
  DOC_AI_ACTIONS,
  filterDocAiActions,
} from "./doc-ai-actions.ts";
import {
  buildGrammarReviewInstruction,
  GRAMMAR_REVIEW_INSTRUCTION,
} from "./grammar-review.ts";
import { filterSlashCommands, SLASH_COMMANDS } from "./slash-commands.ts";

test("buildGrammarReviewInstruction asks for whole-note proofread and patch", () => {
  const instr = buildGrammarReviewInstruction();
  assert.equal(instr, GRAMMAR_REVIEW_INSTRUCTION);
  assert.match(instr, /entire note/i);
  assert.match(instr, /grammar/i);
  assert.match(instr, /Skip math/i);
  assert.match(instr, /@@@PATCH/);
  assert.match(instr, /verbatim/i);
});

test("buildGrammarReviewInstruction appends optional user focus", () => {
  const instr = buildGrammarReviewInstruction("prefer American spelling");
  assert.match(instr, /Additional focus/);
  assert.match(instr, /prefer American spelling/);
});

test("buildGrammarReviewInstruction ignores blank extra", () => {
  const instr = buildGrammarReviewInstruction("   ");
  assert.equal(instr, GRAMMAR_REVIEW_INSTRUCTION);
});

test("slash /review and Review doc-action stay in sync with helper", () => {
  const reviewCmd = SLASH_COMMANDS.find((c) => c.id === "review");
  assert.ok(reviewCmd);
  assert.equal(reviewCmd.instruction, GRAMMAR_REVIEW_INSTRUCTION);

  const reviewAction = DOC_AI_ACTIONS.find((a) => a.id === "review");
  assert.ok(reviewAction);
  assert.equal(reviewAction.buildInstruction(""), GRAMMAR_REVIEW_INSTRUCTION);
});

test("review slash command is gated by includeGrammarReview", () => {
  const withReview = filterSlashCommands("rev", SLASH_COMMANDS, {
    includeGrammarReview: true,
  });
  assert.ok(withReview.some((c) => c.id === "review"));

  const without = filterSlashCommands("", SLASH_COMMANDS, {
    includeGrammarReview: false,
  });
  assert.ok(!without.some((c) => c.id === "review"));
  assert.ok(without.some((c) => c.id === "proofread"));
});

test("review doc action is gated by includeGrammarReview", () => {
  const filtered = filterDocAiActions(DOC_AI_ACTIONS, {
    includeGrammarReview: false,
  });
  assert.ok(!filtered.some((a) => a.id === "review"));
  assert.ok(filtered.some((a) => a.id === "fix-errors"));
});
