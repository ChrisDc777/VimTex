# VimTex — Current state audit

*Fork: ChrisDc777/VimTex. Upstream reference: boscochanam/VimTex (read-only; histories have diverged — see CONTRIBUTING.md).*

## Doc authority

If two docs disagree, **this file + open GitHub issues win**. Do not implement from stale milestone tables.

| Trust | Doc |
|-------|-----|
| Shipped vs not | This file |
| Next work | History Phase 2 (editor time-travel); M5 gate [#35](https://github.com/ChrisDc777/VimTex/issues/35)/[#36](https://github.com/ChrisDc777/VimTex/issues/36) |
| History internals | [`HISTORY.md`](./HISTORY.md) |
| AI shell matrix | [`AI_ROADMAP.md`](./AI_ROADMAP.md) (status line + ✅ rows; ignore leftover `🔄` unless code disagrees) |
| Milestone overview | [`ROADMAP.md`](./ROADMAP.md) — historical; M0–M4 complete; M3 Level A largely shipped |
| Do **not** treat as live backlog | `scripts/issue-backlog.json` (M0 seed only) |

## Continuing work (agent handoff)

| Topic | Where to start |
|-------|----------------|
| Version history shipped (Level A–E) | [`docs/HISTORY.md`](./HISTORY.md), `components/RoomHistoryPanel.tsx` |
| History panel redesign (Phase 1) | ✅ Docs/Notion rail — Automatic/Manual, day groups, Named-only, visual diff vs live |
| Studio experience (Enhanced \| Basic) | ✅ BEUI Enhanced default; Basic = pre-BEUI trees; Forge always Basic — [`UI_VARIANTS.md`](./UI_VARIANTS.md) |
| BEUI registry vendor | ✅ `components/beui/` (MIT); adapters under `components/studio/enhanced/` |
| AI polish (#60) | ✅ closed — usage/stop/regen + room prefs (#112/#116) |
| Chat modes Ask / Edit / Plan | ✅ Ask/Edit (#129); Plan = Enhanced removable chip + `mode=plan` (no patches) |
| History backlog | Level D/E shipped (#127/#128); authorship remap → #37/#78 |
| M4 import/export + polish | ✅ complete — epic [#30](https://github.com/ChrisDc777/VimTex/issues/30) closed |
| Full issue index | [`docs/GITHUB_ISSUES.md`](./GITHUB_ISSUES.md) |
| AI / M3 status | [`docs/AI_ROADMAP.md`](./AI_ROADMAP.md) |

### Prompt for a new Cursor session

```
Pull origin/main. Read docs/CURRENT_STATE.md first (doc authority + handoff),
then docs/HISTORY.md and components/RoomHistoryPanel.tsx.

M4 is complete (#30/#31/#32/#33/#79 closed). History Phase 1 redesign shipped.
AI polish #60 closed. Studio defaults to Enhanced (vendored BEUI under
components/beui/ + studio/enhanced adapters); Preferences → Workspace →
Studio experience: Basic restores the pre-BEUI chat/chrome trees. Enhanced
chrome: Morphing Modal Share on the bottom dock, topbar Import & Export Bloom (opens downward),
bottom Dock (Share/Outline/History/Chat/Preferences).
Forge stays Basic (no BEUI imports).
Edit is the implicit AI default; Enhanced + menu adds removable Ask or Plan
chips. prefers-reduced-motion is independent of Basic. Next: History Phase 2
or M5 gates #35/#36.

If ROADMAP.md, AI_PROVIDERS.md, or scripts/issue-backlog.json disagree with
CURRENT_STATE.md or the code, trust CURRENT_STATE.md and the code.
```

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
- **Studio experience:** `localStorage` `vimtex:studioExperience` = `enhanced` (default) \| `basic`
- **Optional shell:** Forge via `localStorage` `vimtex:uiVariant` (always Basic UI)
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
| Snapshots / version history side panel | ✅ | History icon + `RoomHistoryPanel`, autosnap/pin/rename/index/fork, `/api/rooms/.../snapshots`, #25/#79/#126–#128 |
| Optional LevelDB persistence | ✅ | `YPERSISTENCE` + `y-leveldb`, #71 |
| Reconnect / offline banner | ✅ | `ReconnectBanner.tsx`, #21 |
| Presence / typing | ✅ | awareness, #22 |
| Studio Split / Live preview | ✅ | `ViewToggle.tsx`, `lib/studio-layout.ts` |
| Forge editor tabs + panels | ✅ | `EditorTabBar.tsx`, `SidePanel.tsx` |
| Room chat + @vimothy (shared message list) | ✅ | `useRoomChat`, Ask/Edit/Plan modes, `ChatMessageList` / Enhanced adapters, `api/chat/route.ts` |
| Studio Enhanced (BEUI) | ✅ | `components/beui/`, `components/studio/enhanced/`, `lib/studio-experience-prefs.ts` |
| Share copy + capability links | ✅ | `ShareRoom.tsx`; Enhanced Morphing Modal Share on dock |
| Vim / Standard keys | ✅ | `lib/editor-mode.ts` |
| Onboarding + cheatsheet | ✅ | Onboarding / VimCheatsheet dialogs |
| Templates + recent rooms | ✅ | `lib/templates.ts`, `lib/recent-rooms.ts` |
| Command palette | ✅ | Studio / shared palette |
| Import .tex / .md | ✅ | Enhanced topbar **Import & Export** Bloom + Basic/Forge Menu + palette; `$` → `\( \)`, `lib/import-note.ts`, #31 |
| Export .tex / .md + Copy source | ✅ | Same Bloom / Menu; Overleaf wrapper, `$` math `.md`, lossless Copy; `lib/export.ts` |
| Export PDF + equation SVG/PNG | ✅ | Print-to-PDF; preview hover Copy / SVG / PNG; #32 |
| CI / E2E | ✅ | `.github/workflows/ci.yml`, `e2e/` |
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
