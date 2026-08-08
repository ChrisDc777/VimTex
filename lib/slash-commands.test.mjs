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
