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

  it("keeps pinned checkpoints when FIFO evicts unpinned", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vimtex-snaps-"));
    process.env.ROOM_DATA_DIR = tmp;
    const {
      createSnapshot,
      listSnapshots,
      updateSnapshotMeta,
      MAX_SNAPSHOTS_PER_ROOM,
    } = require("../scripts/y-ws/room-snapshots.js");

    const roomId = "pinretain01";
    const make = (label) => {
      const doc = new Y.Doc();
      doc.getText("codemirror").insert(0, `note ${label}`);
      const update = Y.encodeStateAsUpdate(doc);
      doc.destroy();
      return createSnapshot(roomId, update, label, { skipDedupe: true });
    };

    const pinned = make("keep-me");
    updateSnapshotMeta(roomId, pinned.id, { pinned: true });
    for (let i = 0; i < MAX_SNAPSHOTS_PER_ROOM + 3; i++) {
      make(`v${i}`);
    }
    const snaps = listSnapshots(roomId);
    assert.equal(snaps.some((s) => s.id === pinned.id && s.pinned), true);
    assert.equal(snaps.filter((s) => !s.pinned).length, MAX_SNAPSHOTS_PER_ROOM);
    delete process.env.ROOM_DATA_DIR;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("renames via updateSnapshotMeta and logs without note bodies", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vimtex-snaps-"));
    process.env.ROOM_DATA_DIR = tmp;
    const {
      createSnapshot,
      updateSnapshotMeta,
      snapshotLogPayload,
    } = require("../scripts/y-ws/room-snapshots.js");
    const roomId = "rename01";
    const doc = new Y.Doc();
    doc.getText("codemirror").insert(0, "secret note body");
    const update = Y.encodeStateAsUpdate(doc);
    doc.destroy();
    const created = createSnapshot(roomId, update, "old name", {
      skipDedupe: true,
    });
    const renamed = updateSnapshotMeta(roomId, created.id, {
      label: "Milestone A",
    });
    assert.equal(renamed?.label, "Milestone A");
    assert.equal(renamed?.kind, "named");
    const payload = snapshotLogPayload("patch", renamed);
    const serialized = JSON.stringify(payload);
    assert.equal(serialized.includes("secret note body"), false);
    assert.equal("label" in payload, false);
    assert.equal("createdBy" in payload, false);
    assert.equal(payload.event, "vimtex.snapshot");
    assert.equal(payload.action, "patch");
    delete process.env.ROOM_DATA_DIR;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("indexes metas, paginates, and filters by label (#127)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vimtex-snaps-"));
    process.env.ROOM_DATA_DIR = tmp;
    const {
      createSnapshot,
      querySnapshots,
      listSnapshotsFromFs,
      refreshSnapshotIndex,
    } = require("../scripts/y-ws/room-snapshots.js");
    const { INDEX_NAME } = require("../scripts/y-ws/snapshot-index.js");
    const roomId = "index01";
    for (const label of ["Alpha", "Beta note", "Gamma"]) {
      const doc = new Y.Doc();
      doc.getText("codemirror").insert(0, label);
      const update = Y.encodeStateAsUpdate(doc);
      doc.destroy();
      createSnapshot(roomId, update, label, { skipDedupe: true });
    }
    const indexFile = path.join(tmp, "snapshots", roomId, INDEX_NAME);
    assert.equal(fs.existsSync(indexFile), true);
    const page = querySnapshots(roomId, { q: "beta", limit: 10, offset: 0 });
    assert.equal(page.total, 1);
    assert.equal(page.snapshots[0]?.label, "Beta note");
    fs.unlinkSync(indexFile);
    refreshSnapshotIndex(roomId);
    assert.equal(fs.existsSync(indexFile), true);
    assert.equal(listSnapshotsFromFs(roomId).length, 3);
    delete process.env.ROOM_DATA_DIR;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("forks a checkpoint into a new room with editSecret (#128)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vimtex-snaps-"));
    process.env.ROOM_DATA_DIR = tmp;
    const { createSnapshot, forkSnapshot, listSnapshots, readSnapshotText } =
      require("../scripts/y-ws/room-snapshots.js");
    const { readRoomMeta } = require("../scripts/y-ws/room-meta.js");
    const roomId = "forksrc01";
    const doc = new Y.Doc();
    doc.getText("codemirror").insert(0, "fork me please");
    const update = Y.encodeStateAsUpdate(doc);
    doc.destroy();
    const source = createSnapshot(roomId, update, "Source", {
      skipDedupe: true,
    });
    const forked = forkSnapshot(roomId, source.id);
    assert.ok(forked);
    assert.notEqual(forked.roomId, roomId);
    assert.ok(forked.edit.length > 8);
    assert.equal(readRoomMeta(forked.roomId)?.editSecret, forked.edit);
    assert.equal(readSnapshotText(forked.roomId, forked.snapshot.id), "fork me please");
    assert.equal(listSnapshots(forked.roomId).length, 1);
    delete process.env.ROOM_DATA_DIR;
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
