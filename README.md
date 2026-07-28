# VimTex

**Vim keybindings. Live LaTeX. Shared buffer. Zero setup.**

A collaborative math scratchpad — open a room, type TeX like Vim, and watch KaTeX render as you go. Share the link; everyone edits the same buffer in realtime. Ask `@ai` to rewrite an equation and the whole room sees the change.

**Studio** is the default workspace (Share, Chat, Live/Split). **Forge** (tabs, problem panel, mobile rails) is available as a toggleable alternative. Preference is stored in `localStorage` (`vimtex:uiVariant`).

No accounts required. Sheets can also autosave locally per room in Forge.

---

## Quickstart

```bash
npm install
npm run build
npm start
```

Open **[http://localhost:3001](http://localhost:3001)**. You’ll land in a room (`?room=…`). Hit **Share**, send the URL, and you’re co-editing.

For local development (same custom server + Yjs WebSocket):

```bash
npm run dev
```

### Share outside localhost

```bash
npm start
npm run tunnel   # needs cloudflared
```

Open the printed `https://*.trycloudflare.com` link on two devices with the same room — carets, edits, and chat sync live.

---

## What you get

| | |
|---|---|
| **Vim editor** | CodeMirror 6 + Replit Vim — motions, modes, the works |
| **LaTeX as you type** | KaTeX preview / inline widgets; autocomplete for common commands; bare math like `2^5` |
| **Realtime collab** | Yjs over WebSocket — shared doc, carets, peer count |
| **Room chat** | Sidebar for humans; `@vimothy` for model edits |
| **Two UI shells** | **Studio** (default) or **Forge** (tabs, problem panel, mobile bottom nav) |
| **Studio layouts** | Split (source + preview) or Live (inline math) |
| **Export** | `.tex` / `.md` download |

Type TeX directly — no `$` required for bare commands. Use `\(...\)` for inline and `\[...\]` for display when you want them.

---

## Room lifetime

- Reconnecting to the same `?room=` restores the shared in-memory Yjs doc while the Node process is up.
- Empty rooms (zero WebSocket clients) are garbage-collected after `YROOM_IDLE_MS` (default **30 minutes**).
- Server restart clears all in-memory rooms unless `YPERSISTENCE` is configured.
- Forge also keeps a **browser localStorage** copy per room for solo refresh restore.

---

## AI in the room

Toggle **Chat**, then mention **`@vimothy`**. Only the sender hits OpenRouter; everyone sees the reply and document patch via Yjs.

Copy [`.env.example`](.env.example) to `.env` or `.env.local` (gitignored) and set your key:

```bash
cp .env.example .env
# edit OPENROUTER_API_KEY=sk-or-v1-...
```

Restart after changing env. The key stays on the server (`POST /api/chat`) — never in the browser.

Models (sidebar dropdown):

- `tencent/hy3:free` (default)
- `nvidia/nemotron-3-ultra-550b-a55b:free`

---

## Stack

Next.js · CodeMirror 6 · Yjs · KaTeX · OpenRouter

---

## Planning and roadmap

Development is tracked on **[ChrisDc777/VimTex](https://github.com/ChrisDc777/VimTex)** (fork; upstream: [boscochanam/VimTex](https://github.com/boscochanam/VimTex)).

| Doc | Description |
|-----|-------------|
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased milestones M0–M5 |
| [docs/GITHUB_ISSUES.md](docs/GITHUB_ISSUES.md) | Issue index and execution order |
| [docs/PRODUCT_STRATEGY.md](docs/PRODUCT_STRATEGY.md) | Positioning and personas |
| [docs/UI_VARIANTS.md](docs/UI_VARIANTS.md) | Classic vs Quiet Craft shells |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Fork/upstream workflow |

---

## License

Private / experimental — use at your own risk. Ephemeral by design: don’t store secrets in the buffer.
