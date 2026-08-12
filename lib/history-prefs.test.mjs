import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  DEFAULT_HISTORY_PREFS,
  isHistoryIntervalMinutes,
  loadHistoryPrefs,
  saveHistoryPref,
  saveHistoryPrefs,
} from "./history-prefs.ts";

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

describe("history-prefs", () => {
  it("defaults to idle on, interval off, 10 minutes", () => {
    assert.deepEqual(loadHistoryPrefs(), DEFAULT_HISTORY_PREFS);
    assert.equal(DEFAULT_HISTORY_PREFS.idleAutosnap, true);
    assert.equal(DEFAULT_HISTORY_PREFS.intervalAutosnap, false);
    assert.equal(DEFAULT_HISTORY_PREFS.intervalMinutes, 10);
  });

  it("persists idle, interval, and minutes", () => {
    saveHistoryPref("idleAutosnap", false);
    saveHistoryPrefs({
      ...loadHistoryPrefs(),
      intervalAutosnap: true,
      intervalMinutes: 5,
    });
    assert.deepEqual(loadHistoryPrefs(), {
      idleAutosnap: false,
      intervalAutosnap: true,
      intervalMinutes: 5,
    });
  });

  it("rejects unknown interval minutes", () => {
    assert.equal(isHistoryIntervalMinutes(7), false);
    assert.equal(isHistoryIntervalMinutes(10), true);
  });
});
