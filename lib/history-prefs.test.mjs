import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  autosnapEnabled,
  DEFAULT_HISTORY_PREFS,
  isCheckpointMode,
  isHistoryIntervalMinutes,
  loadHistoryPrefs,
  saveHistoryPref,
  saveHistoryPrefs,
  setCheckpointMode,
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
  it("defaults to automatic mode, idle on, interval off, 10 minutes", () => {
    assert.deepEqual(loadHistoryPrefs(), DEFAULT_HISTORY_PREFS);
    assert.equal(DEFAULT_HISTORY_PREFS.checkpointMode, "automatic");
    assert.equal(DEFAULT_HISTORY_PREFS.idleAutosnap, true);
    assert.equal(DEFAULT_HISTORY_PREFS.intervalAutosnap, false);
    assert.equal(DEFAULT_HISTORY_PREFS.intervalMinutes, 10);
    assert.equal(autosnapEnabled(), true);
  });

  it("persists idle, interval, and minutes", () => {
    saveHistoryPref("idleAutosnap", false);
    saveHistoryPrefs({
      ...loadHistoryPrefs(),
      intervalAutosnap: true,
      intervalMinutes: 5,
    });
    assert.deepEqual(loadHistoryPrefs(), {
      checkpointMode: "automatic",
      idleAutosnap: false,
      intervalAutosnap: true,
      intervalMinutes: 5,
    });
  });

  it("manual mode disables autosnap even when idle flag is on", () => {
    setCheckpointMode("manual");
    const prefs = loadHistoryPrefs();
    assert.equal(prefs.checkpointMode, "manual");
    assert.equal(prefs.idleAutosnap, true);
    assert.equal(autosnapEnabled(prefs), false);
  });

  it("entering automatic with both autosnap flags off turns idle back on", () => {
    saveHistoryPrefs({
      checkpointMode: "manual",
      idleAutosnap: false,
      intervalAutosnap: false,
      intervalMinutes: 10,
    });
    setCheckpointMode("automatic");
    const prefs = loadHistoryPrefs();
    assert.equal(prefs.checkpointMode, "automatic");
    assert.equal(prefs.idleAutosnap, true);
    assert.equal(autosnapEnabled(prefs), true);
  });

  it("rejects unknown interval minutes", () => {
    assert.equal(isHistoryIntervalMinutes(7), false);
    assert.equal(isHistoryIntervalMinutes(10), true);
    assert.equal(isCheckpointMode("automatic"), true);
    assert.equal(isCheckpointMode("manual"), true);
    assert.equal(isCheckpointMode("maybe"), false);
  });
});
