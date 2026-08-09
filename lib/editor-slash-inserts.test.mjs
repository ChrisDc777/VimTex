import assert from "node:assert/strict";
import test from "node:test";
import { changedBeforeLines } from "./text-diff.ts";
import { filterEditorSlashInserts } from "./editor-slash-inserts.ts";

test("changedBeforeLines marks deleted before-lines", () => {
  const before = "a\nb\nc\n";
  const after = "a\nc\n";
  assert.deepEqual(changedBeforeLines(before, after), [2]);
});

test("changedBeforeLines marks changed lines", () => {
  const before = "hello\nworld\n";
  const after = "hello\nWORLD\n";
  assert.deepEqual(changedBeforeLines(before, after), [2]);
});

test("changedBeforeLines is empty when identical", () => {
  assert.deepEqual(changedBeforeLines("x\n", "x\n"), []);
});

test("filterEditorSlashInserts matches section and todo", () => {
  const section = filterEditorSlashInserts("sec");
  assert.ok(section.some((i) => i.slash === "section"));
  const todo = filterEditorSlashInserts("tod");
  assert.ok(todo.some((i) => i.slash === "todo"));
});
