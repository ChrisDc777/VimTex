# VimTex — Current state audit

*Baseline: local `master` @ `edf2935` (2026-07-20). Fork/upstream `master` @ `a9e090a` (2026-07-26), +19 commits.*

## Architecture

```
Browser                    Node (server.mjs :3001)
┌─────────────────┐       ┌──────────────────────────────┐
│ app/page.tsx    │ HTTP  │ Next.js (pages, /api/chat)   │
│ VimEditor       │◄─────►│                              │
│ RoomChatSidebar │ WS    │ y-websocket utils (in-memory)│
│ LatexPreview    │       │ Room = URL path segment        │
└─────────────────┘       └──────────────────────────────┘
```

- **Single route:** `/` + `POST /api/chat`
- **Collab:** Yjs `Y.Text` + `Y.Array` chat, `WebsocketProvider`, awareness carets
- **Editor:** CodeMirror 6 + Replit Vim + y-codemirror.next + Y.UndoManager
- **Math:** KaTeX via `lib/render-note.ts` (split preview + realtime widgets)

## Feature inventory (local `edf2935`)

| Area | Status | Key files |
|------|--------|-----------|
| Room URL + name picker | ✅ | `lib/collab.ts`, `NamePicker.tsx` |
| Live Yjs collab + carets | ✅ | `VimEditor.tsx`, `server.mjs` |
| Split / Realtime views | ✅ | `ViewToggle.tsx`, `cm-math-widgets.ts` |
| Room chat + @ai | ✅ | `RoomChatSidebar.tsx`, `api/chat/route.ts` |
| LaTeX completion | ✅ | `cm-latex-completion.ts` |
| Export .tex / .md | ✅ | `export.ts`, `ExportMenu.tsx` |
| View mode persistence | ❌ stub | `lib/storage.ts` no-ops |
| Local note persistence | ❌ stub | `lib/storage.ts` |
| Server persistence | ⚠️ optional | `YPERSISTENCE` + undeclared `y-leveldb` |
| Idle room GC | ✅ | `YROOM_IDLE_MS` (default 30 min) in `scripts/y-ws/utils.js` |
| Auth / room ACL | ❌ | — |
| CI / typecheck script | ❌ local | Present on fork `a9e090a` |
| API rate limits | ❌ local | Present on fork via `middleware.ts` |

## Fork redesign (`a9e090a`) — what changed

**Added:** Quiet Craft UI, editor tabs (5 max), room-scoped localStorage autosave, problem-image panel (IndexedDB), resizable side panels, mobile bottom tabs, bare-math parser (`2^5`), CI, API payload caps, release workflow, OG/favicon, chat component split.

**Intentionally disabled:** WebSocket `connect: false`, Share hidden, Chat/Live Share → fake Premium dialog.

## Critical technical debt

### 1. Room lifetime (documented + idle GC)

README and product copy distinguish **client** autosave (localStorage, per room) from **server** Yjs rooms: refresh reconnects to the same in-memory doc while the process is alive and the room has not been idle-GC'd; server restart clears; empty rooms are destroyed after `YROOM_IDLE_MS` (default 30 min, `scripts/y-ws/utils.js`). With `YPERSISTENCE`, rooms are written on last disconnect as before.

### 2. Document format ambiguity

Starter uses `# Markdown` headers; renderer only understands `\(...\)`, `\[...\]`, and TeX-command lines. Export is `.md` but content is not real Markdown.

### 3. AI is destructive

Full-buffer replace via `@@@DOCUMENT` markers; no diff, accept/reject, or concurrency guard (`VimEditor.applyAiEdit`).

### 4. Security (public deploy)

- 48-bit room IDs (~6 hex bytes)
- No room auth, rate limits (local), or WS validation
- OpenRouter cost exposure on `/api/chat`

### 5. Monolithic editor

`VimEditor.tsx` owns Yjs, chat, vim, widgets, seeding — hard to add shells or test in isolation.

### 6. Platform hygiene

- `NODE_ENV=development` in npm scripts breaks Windows without `cross-env`
- Playwright has no `webServer` — assumes server running
- `@codemirror/lang-markdown` and `concurrently` unused
- Untracked `bun.lock` vs `package-lock.json`

### 7. Test gaps

E2E covers UX shell + LaTeX completion only. No two-browser collab, reconnect, AI mock, or renderer unit tests (fork has `render-note.test.mjs`).

## Local vs fork — UI comparison

| | Classic (`edf2935`) | Quiet Craft (`a9e090a`) |
|--|---------------------|-------------------------|
| Default view | Split | Inline-only |
| Share / Chat | Enabled | Gated (premium UI) |
| Collab WS | `connect: true` | `connect: false` |
| Name gate | Required modal | Optional skip |
| Tabs | No | Up to 5 |
| Local autosave | No | Yes per room |
| Problem panel | No | Yes (image paste) |

## Recommended convergence

Extract shared **workspace controller** + keep two **thin shells**. Default: Classic + `collaborationEnabled: true`. Optional: Quiet Craft with collaboration re-enabled.
