import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRequire } from "node:module";
import * as Y from "yjs";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const require = createRequire(import.meta.url);

describe("snapshot access", () => {
  it("allows legacy rooms without edit ACL", () => {
    const {
      authorizeSnapshotRead,
      authorizeSnapshotWrite,
    } = require("../scripts/y-ws/snapshot-access.js");
    const roomId = "testroom0001";
    const read = authorizeSnapshotRead(roomId, {});
    const write = authorizeSnapshotWrite(roomId, {});
    assert.equal(read.ok, true);
    assert.equal(write.ok, true);
  });
});

describe("room snapshots retention", () => {
  it("enforces max snapshots per room", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vimtex-snaps-"));
    process.env.ROOM_DATA_DIR = tmp;
    const {
      createSnapshot,
      listSnapshots,
      MAX_SNAPSHOTS_PER_ROOM,
    } = require("../scripts/y-ws/room-snapshots.js");

    const roomId = "retention01";
    for (let i = 0; i < MAX_SNAPSHOTS_PER_ROOM + 5; i++) {
      const doc = new Y.Doc();
      doc.getText("codemirror").insert(0, `note v${i}`);
      const update = Y.encodeStateAsUpdate(doc);
      doc.destroy();
      createSnapshot(roomId, update, `v${i}`, { skipDedupe: true });
    }
    const snaps = listSnapshots(roomId);
    assert.equal(snaps.length, MAX_SNAPSHOTS_PER_ROOM);
    assert.equal(snaps[0]?.label, `v${MAX_SNAPSHOTS_PER_ROOM + 4}`);
    delete process.env.ROOM_DATA_DIR;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("dedupes identical content within window", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vimtex-snaps-"));
    process.env.ROOM_DATA_DIR = tmp;
    const { createSnapshot, listSnapshots } = require(
      "../scripts/y-ws/room-snapshots.js",
    );
    const roomId = "dedupe01";
    const doc = new Y.Doc();
    doc.getText("codemirror").insert(0, "same text");
    const update = Y.encodeStateAsUpdate(doc);
    doc.destroy();
    const a = createSnapshot(roomId, update, "first");
    const b = createSnapshot(roomId, update, "second");
    assert.equal(a.id, b.id);
    assert.equal(listSnapshots(roomId).length, 1);
    delete process.env.ROOM_DATA_DIR;
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
