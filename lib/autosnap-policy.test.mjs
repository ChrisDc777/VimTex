import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatAutosnapLabel,
  hashNoteForAutosnap,
  shouldCreateAutosnap,
} from "./autosnap-policy.ts";

describe("autosnap policy", () => {
  it("coalesces unchanged and in-flight snapshots", () => {
    const text = "\\section{A}";
    const hash = hashNoteForAutosnap(text);
    assert.equal(
      shouldCreateAutosnap({
        enabled: true,
        readOnly: false,
        inFlight: false,
        text,
        lastHash: null,
      }).ok,
      true,
    );
    assert.deepEqual(
      shouldCreateAutosnap({
        enabled: true,
        readOnly: false,
        inFlight: false,
        text,
        lastHash: hash,
      }),
      { ok: false, reason: "unchanged" },
    );
    assert.deepEqual(
      shouldCreateAutosnap({
        enabled: true,
        readOnly: false,
        inFlight: true,
        text,
        lastHash: null,
      }),
      { ok: false, reason: "in_flight" },
    );
  });

  it("skips empty, disabled, and read-only", () => {
    assert.equal(
      shouldCreateAutosnap({
        enabled: false,
        readOnly: false,
        inFlight: false,
        text: "x",
        lastHash: null,
      }).reason,
      "disabled",
    );
    assert.equal(
      shouldCreateAutosnap({
        enabled: true,
        readOnly: true,
        inFlight: false,
        text: "x",
        lastHash: null,
      }).reason,
      "readonly",
    );
    assert.equal(
      shouldCreateAutosnap({
        enabled: true,
        readOnly: false,
        inFlight: false,
        text: "   ",
        lastHash: null,
      }).reason,
      "empty",
    );
  });

  it("labels idle vs interval without note body", () => {
    const label = formatAutosnapLabel("auto_idle", Date.UTC(2026, 0, 1, 12, 0, 0));
    assert.match(label, /^Auto · /);
    assert.equal(label.includes("\\section"), false);
  });
});
