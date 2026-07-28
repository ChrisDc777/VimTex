# VimTex — Current state audit

*Baseline: fork `master` @ Wave 1 merge (Classic default + Quiet Craft toggle). Upstream reference: boscochanam/VimTex.*

## Architecture

```
Browser                    Node (server.mjs :3001)
┌─────────────────┐       ┌──────────────────────────────┐
│ ClassicShell or │ HTTP  │ Next.js (pages, /api/chat)   │
│ QuietCraftShell │◄─────►│                              │
│ VimEditor+Chat  │ WS    │ y-websocket utils (in-memory)│
│ LatexPreview    │       │ Room = URL path segment        │
└─────────────────┘       └──────────────────────────────┘
```

- **Single route:** `/` + `POST /api/chat`
- **UI default:** Classic Collaborative (`.ui-classic` + `app/classic-theme.css`)
- **Optional:** Quiet Craft via `localStorage` `vimtex:uiVariant`
- **Collab:** Yjs `Y.Text` + `Y.Array` chat, `WebsocketProvider`, awareness carets — **enabled in both shells**
- **Editor:** CodeMirror 6 + Replit Vim + y-codemirror.next + Y.UndoManager
- **Math:** KaTeX via `lib/render-note.ts` (bare math, split preview + realtime widgets)

## Feature inventory

| Area | Status | Key files |
|------|--------|-----------|
| Room URL + Classic name picker | ✅ | `lib/collab.ts`, `NamePicker.tsx`, `ClassicShell.tsx` |
| Live Yjs collab + carets | ✅ | `VimEditor.tsx`, `server.mjs` |
| Split / Realtime (Classic) | ✅ | `ViewToggle.tsx` |
| Quiet Craft tabs + panels | ✅ | `QuietCraftShell.tsx`, `EditorTabBar.tsx` |
| Room chat + @ai | ✅ | `ClassicRoomChat.tsx`, `RoomChatSidebar.tsx`, `api/chat/route.ts` |
| Classic visual tokens | ✅ | `app/classic-theme.css` |
| Share copy + fallback | ✅ | `ShareRoom.tsx` |
| Idle room GC | ✅ | `YROOM_IDLE_MS` (default 30 min) |
| CI / typecheck / API limits | ✅ | `.github/workflows/ci.yml`, `middleware.ts` |
| Two-client collab E2E | 🔄 | `e2e/classic-collab.spec.ts` (#10) |
| Auth / room ACL | ❌ | — |
| Shared workspace hooks | ⚠️ partial | Shells extracted; deeper `#5` hooks still to land |

## Critical technical debt

1. **Document format ambiguity** — starter Markdown headers vs TeX-focused renderer (#13).
2. **AI is destructive** — full-buffer replace; no diff accept/reject (#M3).
3. **Monolithic editor** — `VimEditor.tsx` still owns Yjs + chat wiring (#5 deeper).
4. **Security** — short room IDs; no room auth on public deploy.

## Convergence status

Classic is default with live collab. Quiet Craft is optional and also collaborates. Premium gating for Share/Chat was removed.
