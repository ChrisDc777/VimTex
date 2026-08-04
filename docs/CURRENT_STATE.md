# VimTex — Current state audit

*Fork: ChrisDc777/VimTex. Upstream reference: boscochanam/VimTex (read-only; histories have diverged — see CONTRIBUTING.md).*

## Architecture

```
Browser                    Node (server.mjs :3001)
┌─────────────────┐       ┌──────────────────────────────┐
│ StudioShell or  │ HTTP  │ Next.js (app router, /api/chat)│
│ ForgeShell      │◄─────►│                              │
│ VimEditor+Chat  │ WS    │ y-websocket utils (in-memory)│
│ LatexPreview    │       │ Room = URL ?room= segment     │
└─────────────────┘       └──────────────────────────────┘
```

- **Single route:** `/` + `POST /api/chat`
- **UI default:** Studio (`.ui-studio` + `app/studio-theme.css`)
- **Optional:** Forge via `localStorage` `vimtex:uiVariant` (legacy `classic`/`quietCraft` values migrate on load)
- **Collab:** Yjs `Y.Text` + `Y.Array` chat, `WebsocketProvider`, awareness carets — enabled in both shells
- **Editor:** CodeMirror 6 + Replit Vim + y-codemirror.next + Y.UndoManager; Vim/Standard modes
- **Math:** KaTeX via `lib/render-note.ts` (bare math, split preview + realtime widgets)
- **Request limits:** in-memory rate limit in `proxy.ts` (Next.js 16 proxy convention)

## Feature inventory

| Area | Status | Key files |
|------|--------|-----------|
| Room URL sync + Studio name gate | ✅ | `lib/collab.ts`, `NamePicker.tsx` |
| Live Yjs collab + carets | ✅ | `VimEditor.tsx`, `server.mjs` |
| Studio Split / Live preview | ✅ | `ViewToggle.tsx`, `lib/studio-layout.ts` |
| Forge editor tabs + unified right panel | ✅ | `EditorTabBar.tsx`, `lib/use-editor-tabs.ts`, `SidePanel.tsx` |
| Room chat + @vimothy | ✅ | `useRoomChat`, `StudioRoomChat.tsx`, `RoomChatSidebar.tsx`, `api/chat/route.ts` |
| Share copy + fallback | ✅ | `ShareRoom.tsx` |
| Vim / Standard keys | ✅ | `lib/editor-mode.ts` |
| Onboarding + Vim cheatsheet | ✅ | `OnboardingDialog.tsx`, `VimCheatsheetDialog.tsx` |
| Templates + recent rooms | ✅ | `lib/templates.ts`, `lib/recent-rooms.ts` |
| Studio command palette | ✅ | `StudioCommandPalette.tsx` |
| Preferences dialog (both shells) | ✅ | `components/PreferencesDialog.tsx` |
| LaTeX highlighting + relative line numbers | ✅ | `lib/cm-line-numbers.ts`, `lib/cm-latex-highlight.ts` |
| Idle room GC | ✅ | `YROOM_IDLE_MS` (default 30 min) |
| CI / typecheck / API limits | ✅ | `.github/workflows/ci.yml`, `proxy.ts` |
| Problem reference image | ✅ | `ProblemReferencePanel.tsx` |
| Two-client collab E2E | ✅ | `e2e/studio-collab.spec.ts` |
| Canonical document format | ✅ | `docs/FORMAT.md`, `lib/render-note.ts` |
| Auth / room ACL | ❌ | — |
| AI diff accept/reject | 🔄 | — |

## Critical technical debt

1. ~~**Document format ambiguity**~~ — resolved by `docs/FORMAT.md` (#13); `%` comments and `$`-as-literal aligned across highlighter and renderer.
2. **AI is destructive** — full-buffer replace; no diff accept/reject (#M3 / #27).
3. ~~**Monolithic editor**~~ — `WorkspaceController` + `WorkspaceProvider` landed (#5); shells still hold orchestration React state.
4. **Security** — room URLs are capabilities; no ACL yet — see `docs/RFC-collab-persistence.md` (#20).
5. ~~**Dual chat AI paths**~~ — unified via `lib/use-room-chat.ts`.
6. **Persistence** — in-memory Yjs by default; optional LevelDB path must be wired or removed (RFC #20).

## Convergence status

Studio is default with live collab. Forge is optional and also collaborates. Both shells share the editor, chat, storage, and preferences; Premium gating for Share/Chat was removed.
