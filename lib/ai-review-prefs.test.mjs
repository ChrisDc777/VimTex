import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  DEFAULT_AI_REVIEW_PREFS,
  loadAiReviewPrefs,
  saveAiApplyMode,
  saveAiShowInPreview,
  saveAiSnapshotOnAccept,
} from "./ai-review-prefs.ts";

const mem = new Map();

beforeEach(() => {
  mem.clear();
  globalThis.localStorage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => {
      mem.set(k, String(v));
    },
    removeItem: (k) => {
      mem.delete(k);
    },
    clear: () => mem.clear(),
    key: () => null,
    length: 0,
  };
});

describe("ai-review-prefs", () => {
  it("defaults to confirm, preview off, snapshot on accept off", () => {
    assert.deepEqual(loadAiReviewPrefs(), DEFAULT_AI_REVIEW_PREFS);
    assert.equal(DEFAULT_AI_REVIEW_PREFS.snapshotOnAccept, false);
  });

  it("persists apply mode, preview, and snapshot-on-accept flags", () => {
    saveAiApplyMode("auto");
    saveAiShowInPreview(true);
    saveAiSnapshotOnAccept(true);
    assert.deepEqual(loadAiReviewPrefs(), {
      applyMode: "auto",
      showInPreview: true,
      snapshotOnAccept: true,
    });
  });
});
