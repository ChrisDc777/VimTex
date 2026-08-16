import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  DEFAULT_AI_TEMPERATURE,
  loadAiRoomPrefs,
  nearestAiTemperaturePreset,
  normalizeAiChatMode,
  normalizeAiTemperature,
  resolveAiChatMode,
  resolveAiRoomModel,
  saveAiRoomPrefs,
} from "./ai-room-prefs.ts";

const memory = new Map();

beforeEach(() => {
  memory.clear();
  globalThis.localStorage = {
    getItem: (k) => (memory.has(k) ? memory.get(k) : null),
    setItem: (k, v) => {
      memory.set(k, String(v));
    },
    removeItem: (k) => {
      memory.delete(k);
    },
    clear: () => memory.clear(),
    key: () => null,
    get length() {
      return memory.size;
    },
  };
});

describe("ai-room-prefs", () => {
  it("round-trips model per room", () => {
    saveAiRoomPrefs("roomA", { model: "deepseek-v4-flash-free" });
    assert.equal(loadAiRoomPrefs("roomA").model, "deepseek-v4-flash-free");
    assert.equal(loadAiRoomPrefs("roomB").model, undefined);
  });

  it("resolveAiRoomModel falls back to default", () => {
    assert.equal(resolveAiRoomModel(null), "deepseek-v4-flash-free");
    saveAiRoomPrefs("r1", { model: "openai/gpt-4o-mini" });
    assert.equal(resolveAiRoomModel("r1"), "openai/gpt-4o-mini");
  });

  it("clamps temperature", () => {
    assert.equal(normalizeAiTemperature(0.7), 0.7);
    assert.equal(normalizeAiTemperature(-1), 0);
    assert.equal(normalizeAiTemperature(2), 1);
    assert.equal(normalizeAiTemperature("x"), undefined);
    assert.equal(DEFAULT_AI_TEMPERATURE, 0.4);
  });

  it("round-trips chatMode Ask/Edit per room", () => {
    assert.equal(resolveAiChatMode("roomAsk"), "edit");
    saveAiRoomPrefs("roomAsk", { chatMode: "ask" });
    assert.equal(loadAiRoomPrefs("roomAsk").chatMode, "ask");
    assert.equal(resolveAiChatMode("roomAsk"), "ask");
    assert.equal(normalizeAiChatMode("plan"), "plan");
    assert.equal(normalizeAiChatMode("edit"), "edit");
    assert.equal(normalizeAiChatMode("nope"), undefined);
  });
});
