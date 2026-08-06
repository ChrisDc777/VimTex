# VimTex — Current state audit

*Fork: ChrisDc777/VimTex. Upstream reference: boscochanam/VimTex (read-only; histories have diverged — see CONTRIBUTING.md).*

## Architecture

```
Browser                    Node (server.mjs :3001)
┌─────────────────┐       ┌──────────────────────────────┐
│ StudioShell or  │ HTTP  │ Next.js (app router, /api/*) │
│ ForgeShell      │◄─────►│ chat, rooms meta/caps/snaps  │
│ VimEditor+Chat  │ WS    │ y-websocket + optional LevelDB│
│ LatexPreview    │       │ Room = ?room= + edit|view    │
└─────────────────┘       └──────────────────────────────┘
```

- **Single route:** `/` + room APIs under `/api/rooms/...` + `POST /api/chat`
- **UI default:** Studio (`.ui-studio` + `app/studio-theme.css`)
- **Optional:** Forge via `localStorage` `vimtex:uiVariant`
- **Collab:** Yjs `Y.Text` + `Y.Array` chat, `WebsocketProvider`, awareness carets — both shells
- **Guest ACL:** mint `editSecret` on room **create**; WS requires `edit` or `view` once ACL is on (see `docs/RFC-collab-persistence.md`)
- **Editor:** CodeMirror 6 + Replit Vim + y-codemirror.next + Y.UndoManager; Vim/Standard modes
- **Math:** KaTeX via `lib/render-note.ts`
- **Request limits:** in-memory rate limit in `proxy.ts`

## Feature inventory

| Area | Status | Key files |
|------|--------|-----------|
| Room URL sync + Studio name gate | ✅ | `lib/collab.ts`, `NamePicker.tsx` |
| Live Yjs collab + carets | ✅ | `VimEditor.tsx`, `server.mjs` |
| Guest edit/view capabilities | ✅ | `lib/room-auth.ts`, `scripts/y-ws/*`, Share menu |
| Read-only `?view=` (server-enforced) | ✅ | `scripts/y-ws/utils.js`, #23 |
| Room TTL + optional password | ✅ | room meta + gate dialogs, #24 |
| Snapshots / version history modal | ✅ | `/api/rooms/.../snapshots`, #25 |
| Optional LevelDB persistence | ✅ | `YPERSISTENCE` + `y-leveldb`, #71 |
| Reconnect / offline banner | ✅ | `ReconnectBanner.tsx`, #21 |
| Presence / typing | ✅ | awareness, #22 |
| Studio Split / Live preview | ✅ | `ViewToggle.tsx`, `lib/studio-layout.ts` |
| Forge editor tabs + panels | ✅ | `EditorTabBar.tsx`, `SidePanel.tsx` |
| Room chat + @vimothy | ✅ | `useRoomChat`, `api/chat/route.ts` |
| Share copy + capability links | ✅ | `ShareRoom.tsx` |
| Vim / Standard keys | ✅ | `lib/editor-mode.ts` |
| Onboarding + cheatsheet | ✅ | Onboarding / VimCheatsheet dialogs |
| Templates + recent rooms | ✅ | `lib/templates.ts`, `lib/recent-rooms.ts` |
| Command palette | ✅ | Studio / shared palette |
| CI / E2E | ✅ | `.github/workflows/ci.yml`, `e2e/` |
| Docs-style history side panel | ⏸️ | Deferred → M4 polish (#79) |
| Follow-user / presenter mode | ⏸️ | Deferred → later collab (#81) |
| Classroom mode | ⏸️ | Deferred → M5 (#82) |
| AI feature gate (Studio vs Forge) | ✅ | `lib/ai-features.ts`, #59 |
| AI diff accept/reject (Studio) | ✅ | `AiReviewStore` + compact diff, #27 |
| AI streaming + cancel | ✅ | `/api/chat` stream + Stop, #29 |
| AI review prefs (Confirm/Auto, preview) | ✅ | `lib/ai-review-prefs.ts` |
| Accounts / claim guest room | ❌ | M5 (#37, #78) |

## Critical technical debt

1. ~~**Document format ambiguity**~~ — `docs/FORMAT.md` (#13).
2. ~~**AI is destructive**~~ — Studio uses accept/reject diffs (#27); Forge is suggest-only (#59). Streaming + cancel (#29).
3. ~~**Monolithic editor**~~ — `WorkspaceController` + provider (#5).
4. ~~**No guest ACL**~~ — edit/view capabilities landed (#80).
5. ~~**Dual chat AI paths**~~ — `lib/use-room-chat.ts`.
6. **Persistence** — in-memory by default; set `YPERSISTENCE` for LevelDB. Multi-node = M5 (RFC option B).

## Convergence status

Studio is default with live collab and guest capabilities. Forge is optional (tabs, suggest-oriented AI going forward). Both share editor, chat, storage, and preferences.

**M2 exit met:** brief disconnect survives with honest reconnect UX; owner can share view-only and edit links without view→edit escalation.
