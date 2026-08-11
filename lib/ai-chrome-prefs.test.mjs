import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_AI_CHROME_PREFS,
  loadAiChromePrefs,
} from "./ai-chrome-prefs.ts";

test("default chrome prefs favor slash+ghost, hide pills", () => {
  assert.equal(DEFAULT_AI_CHROME_PREFS.slashMenu, true);
  assert.equal(DEFAULT_AI_CHROME_PREFS.ghostText, true);
  assert.equal(DEFAULT_AI_CHROME_PREFS.docActionPills, false);
  assert.equal(DEFAULT_AI_CHROME_PREFS.slashTokenStyle, "gradient");
  assert.ok(DEFAULT_AI_CHROME_PREFS.enabledSlashCommands.includes("explain"));
  assert.deepEqual(DEFAULT_AI_CHROME_PREFS.customSlashCommands, []);
});

test("loadAiChromePrefs returns defaults without localStorage writes", () => {
  const prefs = loadAiChromePrefs();
  assert.equal(typeof prefs.slashMenu, "boolean");
  assert.equal(typeof prefs.docActionPills, "boolean");
  assert.equal(typeof prefs.ghostText, "boolean");
  assert.ok(Array.isArray(prefs.enabledSlashCommands));
  assert.ok(Array.isArray(prefs.customSlashCommands));
});
