# Document history architecture

Phased design for VimTex version history (checkpoints of the shared note text).

## Current stack (Level A–E)

| Layer | Implementation |
|-------|----------------|
| Storage | `scripts/y-ws/room-snapshots.js` — `.bin` Yjs update + `.json` meta under `ROOM_DATA_DIR/snapshots/` |
| Index | `scripts/y-ws/snapshot-index.js` — per-room `_index.json` (dual-read vs FS metas); SQLite/Postgres swap later |
| API | `GET/POST /api/rooms/:id/snapshots` (`?q=&limit=&offset=`), `GET/POST/PATCH/DELETE …/:snapId`, `POST …/:snapId/diff`, `POST …/:snapId/fork` |
| Auth | `scripts/y-ws/snapshot-access.js` — view token (read), edit secret (write), auth token (password rooms) |
| Client | `lib/room-snapshots.ts`, `components/RoomHistoryPanel.tsx`, `lib/use-room-autosnapshots.ts` |
| Restore | API returns note text; client applies via `WorkspaceController.restoreSnapshotText` |
| Diff | `lib/text-diff.ts` line diff (client preview compare vs live) |
| AI Pre-AI | `lib/ai-accept-snapshot.ts` — optional checkpoint on Confirm Accept (#89) |
| Autosnap | **Automatic** checkpoint mode: idle (45s after last **local** edit) + optional interval; **Manual** mode skips autosnaps (named saves only). Live Yjs sync always continues. Prefs: History header + Preferences → Workspace (`lib/history-prefs.ts`) |
| Observability | `vimtex.snapshot` JSON logs on create/restore/patch/fork — ids, kind, lengths only (no note bodies) |
| Fork | `POST …/fork` → new room id + `editSecret` + seeded checkpoint (#128) |

### Metadata (`RoomSnapshotMeta`)

- `kind`: `manual` \| `pre_ai` \| `pre_restore` \| `auto_idle` \| `auto_interval` \| `named` (inferred from label when absent)
- `contentHash`, `charLength` — dedupe + integrity
- `createdBy` — optional display name from client (no accounts yet)
- `pinned` — skipped by FIFO retention

### Retention

- Max **50** unpinned checkpoints per room (`VIMTEX_MAX_SNAPSHOTS` env override)
- FIFO eviction of unpinned only; **pinned survive**
- Dedupe: identical hash within 5 minutes returns existing checkpoint (also coalesces multi-client autosnaps)

### Autosnapshots (Level C) + checkpoint mode

- **Checkpoint mode (`automatic` \| `manual`):** Docs-like policy for *versions only*. Live collab never pauses.
  - **Automatic (default):** idle autosnap on; optional interval from Preferences.
  - **Manual:** no idle/interval creates; user saves via “Name this version”.
- **Idle:** Debounced 45s after a local Yjs edit; coalesces while a create is in flight; skips empty / unchanged hash / read-only / Manual mode.
- **Interval:** default off. 5 / 10 / 15 minute presets in Preferences (Automatic only).
- Server hash-dedupe still applies, so overlapping clients do not stack identical checkpoints.

### Index + search (Level D)

- `_index.json` written on create/patch/delete; rebuilt from FS metas when missing/corrupt.
- `GET /snapshots?q=&limit=&offset=` returns `{ snapshots, total, limit, offset, q }`.
- Unpaginated `GET /snapshots` still returns the full list for existing clients.
- Room TTL `deleteAllSnapshots` removes the directory → index cascades.
- **Cutover:** keep FS `.json` metas as rebuild source; swap `snapshot-index.js` for SQLite/Postgres when multi-node needs shared search (M5).

### Fork (Level E)

- History panel **Fork** creates a new room with its own `editSecret` and opens `?room=&edit=`.
- Account authorship remapping on claim-guest is stubbed (`remapSnapshotAuthorship`) until [#37](https://github.com/ChrisDc777/VimTex/issues/37) / [#78](https://github.com/ChrisDc777/VimTex/issues/78).

### Restore safety

- Optional `pre_restore` checkpoint before restore (enabled in history panel)
- Room-wide replace — chat history is **not** restored

## UI

- **Toolbar:** dedicated History icon (clock) beside Chat in Studio; Forge rail + mobile bottom tabs — icons open History or Chat as separate panels (no shared Chat|History tab strip)
- **Panel:** Docs/Notion-style rail — Automatic|Manual mode, “Name this version”, Named-only filter, day-grouped timeline, Changes/Source preview with line hunks vs live
- Destructive actions (delete / restore / fork) use styled confirm toasts (`notify.confirm`), not browser dialogs
- Read-only sessions can browse and compare; restore/delete/pin/rename/fork require edit capability
- Pin, rename, and fork live on the selected version
- Restore is **room-wide** (chat not restored); a `pre_restore` checkpoint is saved first
- CSS transitions only (`prefers-reduced-motion` respected); no motion library yet

## Deferred

| Topic | Notes |
|-------|-------|
| Editor time-travel overlay | Select version → ghost/read-only past in main editor (Phase 2) — main Docs/Notion gap vs Phase 1 panel preview |
| Shared SQL index | Multi-node / Postgres when RFC B lands |
| Authorship remapping | After accounts (#37) + claim-guest (#78) |
| Motion library | [#130](https://github.com/ChrisDc777/VimTex/issues/130) if shared-element restore UX needs it |

Do not re-implement Level A–E basics.

## Caveats

1. **Restore races** — concurrent editors during restore can interleave; no server-side lock yet.
2. **Cold room create** — `POST` without client `text` may snapshot empty server Y.Doc if room is not warm; prefer client-supplied text.
3. **Multi-node** — filesystem snapshots need sticky volume or object store until M5 RFC B.
4. **LevelDB vs snapshots** — live doc persistence and checkpoint files are separate; backup both in ops.
5. **Autosnap leaders** — every edit client may attempt idle/interval creates; coalescing + 5-minute hash dedupe keep the list from exploding.
