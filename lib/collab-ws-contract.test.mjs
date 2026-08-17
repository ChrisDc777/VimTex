import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { WebSocketServer } from "ws";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const require = createRequire(import.meta.url);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vimtex-contract-"));
process.env.ROOM_DATA_DIR = tmp;
process.env.ROOM_SECRET = "contract-test-secret";
process.env.YROOM_IDLE_MS = "1";

const {
  createEditSecret,
  createViewToken,
  createAuthToken,
  hashPassword,
  verifyEditSecret,
} = require("../scripts/y-ws/room-auth.js");
const { upsertRoomMeta, isRoomExpired } = require("../scripts/y-ws/room-meta.js");
const {
  authorizeSnapshotRead,
  authorizeSnapshotWrite,
} = require("../scripts/y-ws/snapshot-access.js");
const {
  createSnapshot,
  forkSnapshot,
  restoreLiveCodemirror,
} = require("../scripts/y-ws/room-snapshots.js");
const { getYDoc, setupWSConnection } = require("../scripts/y-ws/utils.js");

describe("room HTTP ACL / password / TTL", () => {
  it("rejects snapshot writes without edit when ACL is on", () => {
    const roomId = "aclroom01aaaa";
    const edit = createEditSecret();
    upsertRoomMeta(roomId, { editSecret: edit });
    const denied = authorizeSnapshotWrite(roomId, {});
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 403);
    const allowed = authorizeSnapshotWrite(roomId, { edit });
    assert.equal(allowed.ok, true);
  });

  it("allows snapshot reads with a view token", () => {
    const roomId = "aclroom02bbbb";
    const edit = createEditSecret();
    upsertRoomMeta(roomId, { editSecret: edit });
    const view = createViewToken(roomId);
    const read = authorizeSnapshotRead(roomId, { view });
    assert.equal(read.ok, true);
    const write = authorizeSnapshotWrite(roomId, { view });
    assert.equal(write.ok, false);
  });

  it("requires auth token for password rooms", () => {
    const roomId = "pwroom01cccccc";
    upsertRoomMeta(roomId, { passwordHash: hashPassword("hunter2") });
    const denied = authorizeSnapshotRead(roomId, {});
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 401);
    const auth = createAuthToken(roomId);
    const allowed = authorizeSnapshotRead(roomId, { auth });
    assert.equal(allowed.ok, true);
  });

  it("marks expired rooms and refuses access", () => {
    const roomId = "ttlroom01ddddd";
    const meta = upsertRoomMeta(roomId, { expiresAt: Date.now() - 1000 });
    assert.equal(isRoomExpired(meta), true);
    const denied = authorizeSnapshotRead(roomId, {});
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 410);
  });
});

describe("snapshot restore / fork live Y.Doc", () => {
  it("restore replaces only codemirror and preserves chat", () => {
    const roomId = "restoreroom01aa";
    const doc = getYDoc(roomId);
    doc.getText("codemirror").insert(0, "live text");
    doc.getArray("chat").push([{ id: "m1", text: "hi" }]);
    restoreLiveCodemirror(roomId, "restored note");
    assert.equal(doc.getText("codemirror").toString(), "restored note");
    assert.equal(doc.getArray("chat").length, 1);
  });

  it("fork seeds the destination live Y.Doc", () => {
    const source = "forksrc01eeeeee";
    const srcDoc = new Y.Doc();
    srcDoc.getText("codemirror").insert(0, "forked body");
    const update = Y.encodeStateAsUpdate(srcDoc);
    srcDoc.destroy();
    const snap = createSnapshot(source, update, "named", {
      kind: "named",
      skipDedupe: true,
    });
    const forked = forkSnapshot(source, snap.id);
    assert.ok(forked);
    assert.equal(verifyEditSecret(forked.edit, forked.edit), true);
    const dest = getYDoc(forked.roomId);
    assert.equal(dest.getText("codemirror").toString(), "forked body");
  });
});

describe("two-client Yjs sync / awareness / read-only", () => {
  /** @type {http.Server} */
  let server;
  /** @type {import("ws").WebSocketServer} */
  let wss;
  /** @type {number} */
  let port;

  before(async () => {
    server = http.createServer();
    wss = new WebSocketServer({ server });
    wss.on("connection", (conn, req) => {
      setupWSConnection(conn, req);
    });
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const addr = server.address();
    port = typeof addr === "object" && addr ? addr.port : 0;
  });

  after(async () => {
    for (const client of wss.clients) {
      client.terminate();
    }
    await Promise.race([
      new Promise((resolve) => server.close(resolve)),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
  });

  function waitSynced(provider) {
    return new Promise((resolve) => {
      if (provider.synced) {
        resolve();
        return;
      }
      provider.once("sync", () => resolve());
    });
  }

  it("syncs text and chat between two editors", async () => {
    const roomId = "synctest01ffff";
    const edit = createEditSecret();
    upsertRoomMeta(roomId, { editSecret: edit });
    const wsBase = `ws://127.0.0.1:${port}`;

    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const a = new WebsocketProvider(wsBase, roomId, docA, {
      params: { edit },
      WebSocketPolyfill: WebSocket,
      disableBc: true,
    });
    const b = new WebsocketProvider(wsBase, roomId, docB, {
      params: { edit },
      WebSocketPolyfill: WebSocket,
      disableBc: true,
    });
    try {
      await Promise.race([
        Promise.all([waitSynced(a), waitSynced(b)]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("sync timeout")), 10_000),
        ),
      ]);
      docA.getText("codemirror").insert(0, "hello-contract");
      docA.getArray("chat").push([{ id: "c1", text: "ping" }]);
      await new Promise((r) => setTimeout(r, 400));
      assert.equal(docB.getText("codemirror").toString(), "hello-contract");
      assert.equal(docB.getArray("chat").length, 1);
    } finally {
      a.destroy();
      b.destroy();
      docA.destroy();
      docB.destroy();
    }
  });

  it("rejects view-only document writes server-side", async () => {
    const roomId = "rotest01gggggg";
    const edit = createEditSecret();
    upsertRoomMeta(roomId, { editSecret: edit });
    const view = createViewToken(roomId);
    const wsBase = `ws://127.0.0.1:${port}`;

    const editorDoc = new Y.Doc();
    const viewDoc = new Y.Doc();
    const editor = new WebsocketProvider(wsBase, roomId, editorDoc, {
      params: { edit },
      WebSocketPolyfill: WebSocket,
      disableBc: true,
    });
    const viewer = new WebsocketProvider(wsBase, roomId, viewDoc, {
      params: { view },
      WebSocketPolyfill: WebSocket,
      disableBc: true,
    });
    try {
      await Promise.race([
        Promise.all([waitSynced(editor), waitSynced(viewer)]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("sync timeout")), 10_000),
        ),
      ]);
      editorDoc.getText("codemirror").insert(0, "from-editor");
      await new Promise((r) => setTimeout(r, 400));
      assert.match(viewDoc.getText("codemirror").toString(), /from-editor/);
      viewDoc.getText("codemirror").insert(0, "from-viewer");
      await new Promise((r) => setTimeout(r, 400));
      assert.doesNotMatch(
        editorDoc.getText("codemirror").toString(),
        /from-viewer/,
      );
    } finally {
      editor.destroy();
      viewer.destroy();
      editorDoc.destroy();
      viewDoc.destroy();
    }
  });
});
