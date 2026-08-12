# Document history architecture

Phased design for VimTex version history (checkpoints of the shared note text).

## Current stack (Level A–C)

| Layer | Implementation |
|-------|----------------|
| Storage | `scripts/y-ws/room-snapshots.js` — `.bin` Yjs update + `.json` meta under `ROOM_DATA_DIR/snapshots/` |
| API | `GET/POST /api/rooms/:id/snapshots`, `GET/POST/PATCH/DELETE …/:snapId`, `POST …/:snapId/diff` |
| Auth | `scripts/y-ws/snapshot-access.js` — view token (read), edit secret (write), auth token (password rooms) |
| Client | `lib/room-snapshots.ts`, `components/RoomHistoryPanel.tsx`, `lib/use-room-autosnapshots.ts` |
| Restore | API returns note text; client applies via `WorkspaceController.restoreSnapshotText` |
| Diff | `lib/text-diff.ts` line diff (client preview compare vs live) |
| AI Pre-AI | `lib/ai-accept-snapshot.ts` — optional checkpoint on Confirm Accept (#89) |
| Autosnap | Idle (45s after last **local** edit) + optional interval; prefs in Studio/Forge Preferences → Workspace |
| Observability | `vimtex.snapshot` JSON logs on create/restore/patch — ids, kind, lengths only (no note bodies) |

### Metadata (`RoomSnapshotMeta`)

- `kind`: `manual` \| `pre_ai` \| `pre_restore` \| `auto_idle` \| `auto_interval` \| `named` (inferred from label when absent)
- `contentHash`, `charLength` — dedupe + integrity
- `createdBy` — optional display name from client (no accounts yet)
- `pinned` — skipped by FIFO retention

### Retention

- Max **50** unpinned checkpoints per room (`VIMTEX_MAX_SNAPSHOTS` env override)
- FIFO eviction of unpinned only; **pinned survive**
- Dedupe: identical hash within 5 minutes returns existing checkpoint (also coalesces multi-client autosnaps)

### Autosnapshots (Level C)

- **Idle:** default on. Debounced 45s after a local Yjs edit; coalesces while a create is in flight; skips empty / unchanged hash / read-only.
- **Interval:** default off. 5 / 10 / 15 minute presets in Preferences.
- Server hash-dedupe still applies, so overlapping clients do not stack identical checkpoints.

### Restore safety

- Optional `pre_restore` checkpoint before restore (enabled in history panel)
- Room-wide replace — chat history is **not** restored

## UI

- **Toolbar:** dedicated History icon (clock) beside Chat in Studio; Forge rail + mobile bottom tabs
- **In-panel:** `RightPanelSwitcher` — Chat | History segmented tabs when either panel is open; clicking toolbar icons switches views without hiding the other
- **Share menu:** Version history… still opens History (secondary entry)
- Read-only sessions can browse, preview, and compare; restore/delete/pin/rename require edit capability
- Pin and rename live on the selected checkpoint (PATCH)
- CSS transitions only (`prefers-reduced-motion` respected); no motion library yet

## Deferred (backlog issues)

| Level | Feature |
|-------|---------|
| D | Indexed metadata store (SQLite/Postgres), pagination, full-text search |
| E | Fork-as-new-room, account authorship, team retention policies |

See GitHub [#127](https://github.com/ChrisDc777/VimTex/issues/127)–[#128](https://github.com/ChrisDc777/VimTex/issues/128). Do not re-implement Level A–C.

## Caveats

1. **Restore races** — concurrent editors during restore can interleave; no server-side lock yet.
2. **Cold room create** — `POST` without client `text` may snapshot empty server Y.Doc if room is not warm; prefer client-supplied text.
3. **Multi-node** — filesystem snapshots need sticky volume or object store until M5 RFC B.
4. **LevelDB vs snapshots** — live doc persistence and checkpoint files are separate; backup both in ops.
5. **Autosnap leaders** — every edit client may attempt idle/interval creates; coalescing + 5-minute hash dedupe keep the list from exploding.
