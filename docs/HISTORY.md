# Document history architecture

Phased design for VimTex version history (checkpoints of the shared note text).

## Current stack (Level A–B)

| Layer | Implementation |
|-------|----------------|
| Storage | `scripts/y-ws/room-snapshots.js` — `.bin` Yjs update + `.json` meta under `ROOM_DATA_DIR/snapshots/` |
| API | `GET/POST /api/rooms/:id/snapshots`, `GET/POST/DELETE …/:snapId`, `POST …/:snapId/diff` |
| Auth | `scripts/y-ws/snapshot-access.js` — view token (read), edit secret (write), auth token (password rooms) |
| Client | `lib/room-snapshots.ts`, `components/RoomHistoryPanel.tsx` |
| Restore | API returns note text; client applies via `WorkspaceController.restoreSnapshotText` |
| Diff | `lib/text-diff.ts` line diff (client preview compare vs live) |
| AI Pre-AI | `lib/ai-accept-snapshot.ts` — optional checkpoint on Confirm Accept (#89) |

### Metadata (`RoomSnapshotMeta`)

- `kind`: `manual` \| `pre_ai` \| `pre_restore` \| `named` (inferred from label when absent)
- `contentHash`, `charLength` — dedupe + integrity
- `createdBy` — optional display name from client (no accounts yet)

### Retention

- Max **50** checkpoints per room (`VIMTEX_MAX_SNAPSHOTS` env override)
- FIFO eviction (pinned reserved for Level C)
- Dedupe: identical hash within 5 minutes returns existing checkpoint

### Restore safety

- Optional `pre_restore` checkpoint before restore (enabled in history panel)
- Room-wide replace — chat history is **not** restored

## UI

- **Studio / Forge:** Share → Version history opens `RoomHistoryPanel` in the right `SidePanel`
- Read-only sessions can browse, preview, and compare; restore/delete require edit capability
- CSS transitions only (`prefers-reduced-motion` respected); no motion library yet

## Deferred (backlog issues)

| Level | Feature |
|-------|---------|
| C | Autosnapshots (idle/interval), pin/rename, observability |
| D | Indexed metadata store (SQLite/Postgres), pagination, full-text search |
| E | Fork-as-new-room, account authorship, team retention policies |

See GitHub issues for tracking.

## Caveats

1. **Restore races** — concurrent editors during restore can interleave; no server-side lock yet.
2. **Cold room create** — `POST` without client `text` may snapshot empty server Y.Doc if room is not warm; prefer client-supplied text.
3. **Multi-node** — filesystem snapshots need sticky volume or object store until M5 RFC B.
4. **LevelDB vs snapshots** — live doc persistence and checkpoint files are separate; backup both in ops.
