import assert from "node:assert/strict";
import test from "node:test";

// recent-rooms guards on `typeof window`, so provide a browser stub up front.
const store = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { loadRecentRooms, recordRecentRoom, clearRecentRooms, removeRecentRoom } =
  await import("./recent-rooms.ts");

test("records a room and loads it back", () => {
  clearRecentRooms();
  recordRecentRoom("abc");
  const rooms = loadRecentRooms();
  assert.equal(rooms.length, 1);
  assert.equal(rooms[0].id, "abc");
  assert.ok(typeof rooms[0].at === "number");
});

test("dedupes and moves an existing room to the front", () => {
  clearRecentRooms();
  recordRecentRoom("first");
  recordRecentRoom("second");
  recordRecentRoom("first");
  const rooms = loadRecentRooms();
  assert.deepEqual(
    rooms.map((r) => r.id),
    ["first", "second"],
  );
});

test("caps the recent list and allows removal", () => {
  clearRecentRooms();
  for (let i = 0; i < 12; i += 1) recordRecentRoom(`room-${i}`);
  assert.equal(loadRecentRooms().length, 8);
  assert.equal(loadRecentRooms()[0].id, "room-11");
  removeRecentRoom("room-11");
  assert.equal(loadRecentRooms()[0].id, "room-10");
});
