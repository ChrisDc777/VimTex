import assert from "node:assert/strict";
import test from "node:test";
import { filterSlashCommands, SLASH_COMMANDS } from "./slash-commands.ts";

test("filterSlashCommands returns all when query empty", () => {
  assert.equal(filterSlashCommands("").length, SLASH_COMMANDS.length);
});

test("filterSlashCommands matches id prefix", () => {
  const hits = filterSlashCommands("exp");
  assert.ok(hits.some((c) => c.id === "explain"));
  assert.ok(hits.some((c) => c.id === "expand"));
  assert.ok(!hits.some((c) => c.id === "fix"));
});

test("filterSlashCommands matches title", () => {
  const hits = filterSlashCommands("fix");
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.id, "fix");
});

test("review slash command is whole-note and gated", () => {
  const review = SLASH_COMMANDS.find((c) => c.id === "review");
  assert.ok(review);
  assert.equal(review.grammarReview, true);
  assert.match(review.instruction, /entire note/i);
  assert.match(review.instruction, /@@@PATCH/);

  const without = filterSlashCommands("", SLASH_COMMANDS, {
    includeGrammarReview: false,
  });
  assert.ok(!without.some((c) => c.id === "review"));
});
