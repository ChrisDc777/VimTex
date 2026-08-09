import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAiAcceptSnapshotLabel } from "./ai-accept-snapshot.ts";

describe("formatAiAcceptSnapshotLabel", () => {
  it("includes Before AI prefix, source, and local time", () => {
    const at = Date.UTC(2026, 7, 9, 12, 5); // fixed instant
    const label = formatAiAcceptSnapshotLabel("chat", at);
    assert.match(label, /^Before AI: chat · /);
    assert.ok(label.length < 48);
  });

  it("labels each known source", () => {
    for (const source of ["chat", "selection", "slash", "diagnostics"]) {
      const label = formatAiAcceptSnapshotLabel(source, 0);
      assert.match(label, new RegExp(`^Before AI: ${source} · `));
    }
  });
});
