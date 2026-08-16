import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  DEFAULT_STUDIO_EXPERIENCE,
  loadStudioExperience,
  normalizeStudioExperience,
  saveStudioExperience,
  studioExperienceLabel,
  STUDIO_EXPERIENCE_KEY,
} from "./studio-experience-prefs.ts";

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

describe("studio-experience-prefs", () => {
  it("defaults to Enhanced", () => {
    assert.equal(DEFAULT_STUDIO_EXPERIENCE, "enhanced");
    assert.equal(loadStudioExperience(), "enhanced");
  });

  it("normalizes only enhanced|basic", () => {
    assert.equal(normalizeStudioExperience("enhanced"), "enhanced");
    assert.equal(normalizeStudioExperience("basic"), "basic");
    assert.equal(normalizeStudioExperience("calm"), null);
    assert.equal(normalizeStudioExperience(1), null);
  });

  it("persists and reloads", () => {
    saveStudioExperience("basic");
    assert.equal(localStorage.getItem(STUDIO_EXPERIENCE_KEY), "basic");
    assert.equal(loadStudioExperience(), "basic");
    saveStudioExperience("enhanced");
    assert.equal(loadStudioExperience(), "enhanced");
  });

  it("labels experiences", () => {
    assert.equal(studioExperienceLabel("enhanced"), "Enhanced");
    assert.equal(studioExperienceLabel("basic"), "Basic");
  });
});
