import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AWARENESS_FIELDS,
  CAPABILITY_QUERY_KEYS,
  MAX_SNAPSHOTS_HARD_CAP,
  MAX_UNPINNED_SNAPSHOTS,
  ROOM_HEADERS,
  ROOM_HTTP_PATHS,
  WS_MESSAGE_AWARENESS,
  WS_MESSAGE_SYNC,
  YJS_CHAT_KEY,
  YJS_TEXT_KEY,
  isValidRoomId,
  isValidSnapId,
  roomApiPath,
} from "./collab-contract.ts";

describe("collab contract fixtures", () => {
  it("keeps Yjs type keys and WS message types stable", () => {
    assert.equal(YJS_TEXT_KEY, "codemirror");
    assert.equal(YJS_CHAT_KEY, "chat");
    assert.equal(WS_MESSAGE_SYNC, 0);
    assert.equal(WS_MESSAGE_AWARENESS, 1);
    assert.deepEqual([...AWARENESS_FIELDS], ["user", "typing"]);
  });

  it("keeps HTTP headers, query keys, and room paths stable", () => {
    assert.equal(ROOM_HEADERS.edit, "x-vimtex-edit");
    assert.equal(ROOM_HEADERS.view, "x-vimtex-view");
    assert.equal(ROOM_HEADERS.auth, "x-vimtex-auth");
    assert.equal(CAPABILITY_QUERY_KEYS.edit, "edit");
    assert.equal(CAPABILITY_QUERY_KEYS.view, "view");
    assert.equal(ROOM_HTTP_PATHS.meta, "/meta");
    assert.equal(
      roomApiPath("abcd1234efgh5678", "/meta"),
      "/api/rooms/abcd1234efgh5678/meta",
    );
  });

  it("validates room and snapshot ids", () => {
    assert.equal(isValidRoomId("abcd1234"), true);
    assert.equal(isValidRoomId("ab"), false);
    assert.equal(isValidSnapId("k1m2-abc"), true);
    assert.equal(isValidSnapId(""), false);
  });

  it("documents snapshot retention caps", () => {
    assert.equal(MAX_UNPINNED_SNAPSHOTS, 50);
    assert.equal(MAX_SNAPSHOTS_HARD_CAP, 100);
  });
});
