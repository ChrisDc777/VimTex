import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as Y from "yjs";

/** Mirrors POST /snapshots with `{ text }` + restore decode path. */
function encodeTextCheckpoint(text) {
  const snapDoc = new Y.Doc();
  try {
    if (text.length > 0) {
      snapDoc.getText("codemirror").insert(0, text);
    }
    return Y.encodeStateAsUpdate(snapDoc);
  } finally {
    snapDoc.destroy();
  }
}

function decodeTextCheckpoint(update) {
  const snapshotDoc = new Y.Doc();
  try {
    Y.applyUpdate(snapshotDoc, update);
    return snapshotDoc.getText("codemirror").toString();
  } finally {
    snapshotDoc.destroy();
  }
}

describe("text checkpoint encode/decode", () => {
  it("round-trips pre-AI note text including empty", () => {
    for (const text of ["", "plain", "\\section{A}\nline2", "unicode ∆ ✓"]) {
      assert.equal(decodeTextCheckpoint(encodeTextCheckpoint(text)), text);
    }
  });
});
