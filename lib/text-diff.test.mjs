import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffLines, summarizeDiff } from "./text-diff.ts";

describe("text-diff", () => {
  it("marks unchanged lines as same", () => {
    const lines = diffLines("a\nb\nc", "a\nb\nc");
    assert.equal(lines.every((l) => l.kind === "same"), true);
    assert.deepEqual(summarizeDiff(lines), { added: 0, removed: 0 });
  });

  it("detects insertions and deletions", () => {
    const lines = diffLines("a\nc", "a\nb\nc");
    const summary = summarizeDiff(lines);
    assert.equal(summary.added, 1);
    assert.equal(summary.removed, 0);
    assert.ok(lines.some((l) => l.kind === "add" && l.text === "b"));
  });

  it("detects replacements", () => {
    const lines = diffLines("hello", "world");
    const summary = summarizeDiff(lines);
    assert.equal(summary.removed, 1);
    assert.equal(summary.added, 1);
  });
});
