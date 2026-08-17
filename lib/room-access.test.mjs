import assert from "node:assert/strict";
import test from "node:test";

const store = new Map();
const session = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.sessionStorage = {
  getItem: (k) => (session.has(k) ? session.get(k) : null),
  setItem: (k, v) => session.set(k, String(v)),
  removeItem: (k) => session.delete(k),
};

const {
  loadRoomAccess,
  saveRoomAccess,
  clearRoomAccess,
  clearAllRoomAccess,
  migrateSessionEditSecret,
} = await import("./room-access.ts");

test("stores edit/view access separately from the recent list", () => {
  clearAllRoomAccess();
  saveRoomAccess("room-a", { edit: "edit-secret" });
  saveRoomAccess("room-b", { view: "view-token" });
  assert.equal(loadRoomAccess("room-a")?.edit, "edit-secret");
  assert.equal(loadRoomAccess("room-b")?.view, "view-token");
  clearRoomAccess("room-a");
  assert.equal(loadRoomAccess("room-a"), null);
  assert.equal(loadRoomAccess("room-b")?.view, "view-token");
});

test("migrates sessionStorage edit secrets into localStorage", () => {
  clearAllRoomAccess();
  session.set("vimtex:roomEdit:legacy1", "sess-edit");
  const migrated = migrateSessionEditSecret("legacy1");
  assert.equal(migrated, "sess-edit");
  assert.equal(loadRoomAccess("legacy1")?.edit, "sess-edit");
  assert.equal(session.has("vimtex:roomEdit:legacy1"), false);
});
