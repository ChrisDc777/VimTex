# VimTex

**Vim keybindings. Inline LaTeX. Your scratch sheet.**

A keyboard-first math scratchpad — open the app, type TeX on a blank sheet, and watch KaTeX render in place as you work. No separate math mode, no preview pane required. Export when you are done.

Your sheet autosaves locally per room. Refresh restores it. **New** starts a fresh room without erasing older sheets.

**Live share** (real-time collaboration and room chat) is a **Premium** feature — shown in the Sheet menu but not available on the free tier yet. Solo editing works fully offline in **Local** mode.

---

## Quickstart

```bash
npm install
npm run build
npm start
```

Open **[http://localhost:3001](http://localhost:3001)**. You land on a blank sheet (`?room=…`). Type immediately.

For local development:

```bash
npm run dev
```

### Live share (Premium — coming soon)

Real-time collaboration requires a WebSocket server (`server.mjs`). It is disabled in the app UI for now and surfaced as a Premium upgrade path. Solo **Local** mode does not need the WebSocket server for editing.

---

## How it works

| | |
|---|---|
| **One surface** | Type prose and math in the same editor — rendered math stays on the line |
| **Caret reveals source** | Move the cursor into math to edit the raw TeX; move away to see KaTeX |
| **Inline by default** | Bare commands like `\frac{1}{2}` render inline; use `\[...\]` for display math |
| **Vim editor** | CodeMirror 6 + Replit Vim — motions, modes, Tab/Enter to hop `\frac{}{}` fields |
| **Local autosave** | Each room restores after refresh; **New** opens a clean sheet in a new room |
| **Optional tools** | **Preview** (rendered export view), **Live share** (Premium), **Chat** (Premium), `.tex` / `.md` export |

Use `\(...\)` when you need explicit inline boundaries in prose. Use `\[...\]` when you want a displayed equation. No `$` delimiters.

---

## AI assistant

Use **`@ai`** in the composer when room chat is available (Premium). For now, live share is disabled — AI chat via the room panel is part of the Premium tier.

Create `.env` or `.env.local` (gitignored):

```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

Restart after changing env. The key stays on the server (`POST /api/chat`) — never in the browser.

Models (sidebar dropdown):

- `tencent/hy3:free` (default)
- `nvidia/nemotron-3-ultra-550b-a55b:free`

---

## Stack

Next.js · CodeMirror 6 · Yjs · KaTeX · OpenRouter

---

## License

Private / experimental — use at your own risk. Do not store secrets in the buffer.
