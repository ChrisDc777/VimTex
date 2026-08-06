import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AiReviewStore } from "./ai-review-store.ts";

describe("AiReviewStore", () => {
  it("setPending and clearPending notify listeners", () => {
    const store = new AiReviewStore();
    let ticks = 0;
    store.subscribe(() => {
      ticks += 1;
    });
    store.setPending({
      messageId: "m1",
      before: "a",
      after: "b",
      source: "chat",
      createdAt: 1,
    });
    assert.equal(store.hasPending(), true);
    assert.equal(ticks, 1);
    store.clearPending();
    assert.equal(store.hasPending(), false);
    assert.equal(ticks, 2);
  });

  it("commitAuto keeps undo buffer and clears pending", () => {
    const store = new AiReviewStore();
    const edit = {
      messageId: "m2",
      before: "old",
      after: "new",
      source: "chat",
      createdAt: 2,
    };
    store.setPending(edit);
    store.commitAuto(edit);
    assert.equal(store.getPending(), null);
    assert.equal(store.getSnapshot().outcomes.m2, "auto");
    assert.equal(store.takeLastAuto()?.after, "new");
    assert.equal(store.getSnapshot().lastAuto, null);
  });

  it("reset clears all state", () => {
    const store = new AiReviewStore();
    store.setPending({
      messageId: "m3",
      before: "x",
      after: "y",
      source: "chat",
      createdAt: 3,
    });
    store.markOutcome("m3", "accepted");
    store.reset();
    const snap = store.getSnapshot();
    assert.equal(snap.pending, null);
    assert.deepEqual(snap.outcomes, {});
    assert.equal(snap.lastAuto, null);
  });
});
