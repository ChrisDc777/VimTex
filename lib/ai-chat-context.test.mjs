import assert from "node:assert/strict";
import test from "node:test";
import {
  extractSurroundingLines,
  packAiChatContext,
  selectionContextPreview,
  truncateAroundCaret,
} from "./ai-chat-context.ts";

test("truncateAroundCaret leaves short docs alone", () => {
  const r = truncateAroundCaret("hello", 2, 100);
  assert.equal(r.text, "hello");
  assert.equal(r.truncated, false);
});

test("truncateAroundCaret keeps a window around the caret", () => {
  const text = "A".repeat(100) + "FOCUS" + "B".repeat(100);
  const focus = 100;
  const r = truncateAroundCaret(text, focus, 40);
  assert.equal(r.truncated, true);
  assert.ok(r.text.includes("FOCUS") || r.text.includes("A") || r.text.includes("B"));
  assert.ok(r.text.length <= 40);
});

test("extractSurroundingLines returns nearby lines", () => {
  const text = "a\nb\nc\nd\ne";
  // caret on 'c' — offset 4
  assert.equal(extractSurroundingLines(text, 4, 4, 1), "b\nc\nd");
});

test("packAiChatContext omits selection for Forge", () => {
  const packed = packAiChatContext({
    text: "doc",
    selection: "sel",
    surrounding: "sur",
    caret: { offset: 0, line: 1, column: 1 },
    includeSelectionContext: false,
  });
  assert.equal(packed.document, "doc");
  assert.equal(packed.selection, undefined);
  assert.equal(packed.surrounding, undefined);
  assert.equal(packed.caret, undefined);
});

test("packAiChatContext includes selection for Studio", () => {
  const packed = packAiChatContext({
    text: "full document",
    selection: "piece",
    surrounding: "around",
    caret: { offset: 2, line: 1, column: 3 },
    includeSelectionContext: true,
  });
  assert.equal(packed.selection, "piece");
  assert.equal(packed.surrounding, "around");
  assert.deepEqual(packed.caret, { offset: 2, line: 1, column: 3 });
});

test("selectionContextPreview formats line range", () => {
  const snap = {
    text: "one\ntwo\nthree",
    selection: "two\nthree",
    selectionFrom: 4,
    selectionTo: 13,
    caret: { offset: 13, line: 3, column: 6 },
    surrounding: "one\ntwo\nthree",
  };
  const preview = selectionContextPreview(snap);
  assert.ok(preview);
  assert.equal(preview.label, "L2–3");
  assert.match(preview.preview, /two/);
});
