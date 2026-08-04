# RFC: Production collaboration and persistence

**Status:** Proposed  
**Issue:** [#20](https://github.com/ChrisDc777/VimTex/issues/20)  
**Date:** 2026-08-04  
**Author:** VimTex maintainers (ChrisDc777 fork)

## Context

VimTex rooms today are **in-memory Yjs documents** served by `server.mjs` + `scripts/y-ws/utils.js` on the same Node process as Next.js. Empty rooms are garbage-collected after `YROOM_IDLE_MS` (default 30 minutes). Optional `YPERSISTENCE` LevelDB wiring exists in utils but **`y-leveldb` is not a declared dependency**, so the path is effectively dead.

Studio relies on the live Yjs buffer (no client autosave). Forge additionally debounce-writes `vimtex:note:*` to localStorage as a solo refresh cache.

M2 wants: read-only share links (#23), room TTL / optional password (#24), snapshots / history (#25). Those must sit on a clear source-of-truth and capability model.

## Goals

1. One durable source of truth for the collaborative buffer while the room is “alive.”
2. Honest UX when disconnected (no false “saving locally” claims).
3. Capability-based sharing that does not require full accounts (accounts remain M5).
4. A path to multi-instance later without rewriting the client `WorkspaceController`.

## Non-goals (this RFC)

- User accounts, SSO, billing (M5)
- AI accept/reject diffs (M3)
- Multi-file projects / full LaTeX builds

## Options considered

| Option | Pros | Cons |
|--------|------|------|
| **A. Single-node Yjs + optional LevelDB** | Small change; matches current deploy; cheap | No HA; sticky process; ops must back up LevelDB |
| **B. Hocuspocus + Postgres** | Production-grade persistence, extensions | New runtime surface; ops cost; slower to land |
| **C. y-websocket + Redis pub/sub only** | Scales fan-out | Still needs a doc store; more moving parts |

## Decision (M2 near-term)

**Choose A for M2.** Keep the custom `server.mjs` + y-websocket stack.

1. **Wire or remove LevelDB:** add optional `y-leveldb` behind `YPERSISTENCE`, document it in README, or delete the dead branch. Prefer **wire as optional** so demos can survive restart without forcing Postgres.
2. **Source of truth:** when connected, `WorkspaceController` Y.Doc is SoT. Forge localStorage remains a **client cache only** (seed empty rooms / solo refresh), never authoritative over the server doc after sync.
3. **Idle GC vs TTL:** keep process-local idle GC. Room **TTL** (#24) is a separate absolute expiry clock stored with the room metadata (LevelDB or a tiny side map), independent of “no clients.”
4. **Defer B** to M5 / when multi-region or multi-instance is required. Client already talks Yjs protocols; migrating the server later should not require shell rewrites.

## Capability model (for #23 / #24)

Rooms stay addressable by `?room=<id>`. Today IDs are 48-bit and **unguessable enough for casual use, not secrets**.

| Capability | Mechanism |
|------------|-----------|
| **Edit (default)** | Knowing the room id (current behavior) |
| **Read-only (#23)** | Separate `?room=&view=<token>` or `/r/<token>` where token is a HMAC of `roomId\|ro\|secret`. Server (or client gate) refuses write awareness updates / Yjs updates from RO clients — **prefer server-enforced** once persistence exists. |
| **Password (#24)** | Optional password hash on room metadata; WS handshake or first HTTP challenge before attach. |
| **Snapshots (#25)** | Periodic Yjs encodeStateAsUpdate blobs keyed by room + timestamp; restore creates a new update or replaces doc under confirmation. |

**Decision:** lengthen new room IDs to **16 hex chars (64-bit)** going forward; migrate is not required for old links. Document that room URLs are capabilities.

## Client architecture implications

Already landed and should remain the seam:

- `lib/workspace-controller.ts` + `WorkspaceProvider`
- Shared `useRoomChat` for AI/chat (both shells)
- Shell-specific chrome only (Studio stream chat vs Forge panel chat)

Before implementing ACL in the UI, avoid forking logic in StudioShell and ForgeShell — extend the controller (e.g. `readOnly: boolean`, `reconnect()`, room meta).

## AI edits (related risk)

`applyAiEdit` still full-buffer replaces. M2 does not block on M3 diffs, but production demos should treat concurrent @vimothy applies as **best-effort** until #27.

## Implementation sequence

1. Document this RFC; comment on #20 (done with this file).
2. Optional LevelDB: add dep + README, or delete dead code.
3. Lengthen `createRoomId`; honest reconnect copy (Studio vs Forge).
4. #23 read-only tokens (server enforce).
5. #24 password + absolute TTL metadata.
6. #25 snapshot store on the chosen persistence layer.

## Open questions for product

- Should read-only links allow chat read / chat post / neither?
- Should password rooms still be discoverable by id alone (password only at join)?

Defaults proposed: RO = view note + presence, no chat post, no edits; password = required once per browser session (sessionStorage flag).
