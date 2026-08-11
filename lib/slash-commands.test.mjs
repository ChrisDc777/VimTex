import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ENABLED_SLASH_IDS,
  filterSlashCommands,
  SLASH_COMMANDS,
  stripTrailingSlashToken,
} from "./slash-commands.ts";

test("filterSlashCommands returns all when query empty", () => {
  assert.equal(filterSlashCommands("").length, SLASH_COMMANDS.length);
});

test("default slash menu stays core-sized", () => {
  assert.ok(DEFAULT_ENABLED_SLASH_IDS.length <= 8);
  assert.ok(DEFAULT_ENABLED_SLASH_IDS.includes("explain"));
  assert.ok(DEFAULT_ENABLED_SLASH_IDS.includes("derive"));
  assert.ok(!DEFAULT_ENABLED_SLASH_IDS.includes("expand"));
  assert.ok(!DEFAULT_ENABLED_SLASH_IDS.includes("letter"));

  const menu = filterSlashCommands("", SLASH_COMMANDS, {
    enabledIds: DEFAULT_ENABLED_SLASH_IDS,
  });
  assert.equal(menu.length, DEFAULT_ENABLED_SLASH_IDS.length);
  assert.ok(!menu.some((c) => c.id === "letter"));
});

test("optional slash commands can be re-enabled", () => {
  const menu = filterSlashCommands("", SLASH_COMMANDS, {
    enabledIds: [...DEFAULT_ENABLED_SLASH_IDS, "summarize", "letter"],
    includeTemplates: true,
  });
  assert.ok(menu.some((c) => c.id === "summarize"));
  assert.ok(menu.some((c) => c.id === "letter"));
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

test("stripTrailingSlashToken removes /partial before caret", () => {
  const value = "hi /ex";
  const { next, caret } = stripTrailingSlashToken(value, value.length);
  assert.equal(next, "hi ");
  assert.equal(caret, 3);
});
