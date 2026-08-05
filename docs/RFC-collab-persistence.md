# RFC: Production collaboration and persistence

**Status:** Accepted (M2 near-term = option A)  
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

1. **Wire LevelDB:** `y-leveldb` is a dependency; set `YPERSISTENCE=/path/to/dir` to enable. If the env var is set but the module is missing, the server fails fast with a clear log.
2. **Source of truth:** when connected, `WorkspaceController` Y.Doc is SoT. Forge localStorage remains a **client cache only** (seed empty rooms / solo refresh), never authoritative over the server doc after sync.
3. **Idle GC vs TTL:** keep process-local idle GC. Room **TTL** (#24) is a separate absolute expiry clock stored with the room metadata (LevelDB or a tiny side map), independent of “no clients.”
4. **Defer B** to M5 / when multi-region or multi-instance is required. Client already talks Yjs protocols; migrating the server later should not require shell rewrites.

## Capability model (guest mode)

Rooms stay addressable by `?room=<id>` (16 hex chars). **After the first Share**, the room id is only an address — writes require an opaque edit capability.

| Capability | Mechanism |
|------------|-----------|
| **Edit (guest)** | `?room=<id>&edit=<editSecret>` — random secret stored in room meta (`ROOM_DATA_DIR`). Minted/returned via `POST /api/rooms/:id/capabilities`. SessionStorage keeps the creator’s copy. |
| **View-only (#23)** | `?room=<id>&view=<hmac>` — HMAC of `ro:roomId` with `ROOM_SECRET`. WS allows sync + presence; refuses Yjs writes. Stripping `?view=` does **not** escalate without `edit`. |
| **Password (#24)** | Optional password hash on room metadata; WS requires `auth` session token after unlock. |
| **Snapshots (#25)** | Manual `Y.encodeStateAsUpdate` blobs under `ROOM_DATA_DIR/snapshots`; restore replaces the live note text. |

**Legacy:** Rooms with no `editSecret` still treat knowing the room id as edit (pre-Share). First “Copy edit/view link” upgrades the room and enables ACL.

**Decision:** lengthen new room IDs to **16 hex chars (64-bit)** going forward; migrate is not required for old links.

### Guest → claimed (M5, not implemented)

Guest phase: documents are owned by capability tokens, not user identities. Guests share only View or Edit links (no user-specific invites).

When optional accounts land (see [#37](https://github.com/ChrisDc777/VimTex/issues/37)):

1. A signed-in user may **claim** a guest room (prove edit capability, then attach ownership to the account).
2. Ownership transfers to the account; sharing switches to the Docs/Notion model (user invites, roles, teams, managed share links).
3. Existing edit/view capability links should remain valid or be rotated under account-managed sharing — details belong in the accounts RFC.

## Client architecture implications

Already landed and should remain the seam:

- `lib/workspace-controller.ts` + `WorkspaceProvider`
- Shared `useRoomChat` for AI/chat (both shells)
- Shell-specific chrome only (Studio stream chat vs Forge panel chat)

ACL and RO flags live on the controller (`readOnly`, WS `params` for `view` / `edit` / `auth`), not duplicated in both shells.

## AI edits (related risk)

`applyAiEdit` still full-buffer replaces. M2 does not block on M3 diffs, but production demos should treat concurrent @vimothy applies as **best-effort** until #27.

## Implementation sequence

1. Document this RFC; comment on #20 (done with this file).
2. Optional LevelDB: add dep + README, or delete dead code.
3. Lengthen `createRoomId`; honest reconnect copy (Studio vs Forge).
4. #23 read-only tokens (server enforce).
5. #24 password + absolute TTL metadata.
6. #25 snapshot store on the chosen persistence layer.
7. Guest edit capability tokens (room id ≠ write once ACL enabled).

## Open questions for product

- Should password rooms still be discoverable by id alone (password only at join)?

Defaults: RO = view note + presence, no chat post, no edits; password = required once per browser session (sessionStorage flag); edit = opaque `edit` secret after first Share.