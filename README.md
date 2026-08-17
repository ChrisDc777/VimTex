# VimTex

**Vim keybindings. Live LaTeX. Shared buffer. Zero setup.**

A collaborative math scratchpad — open a room, type TeX like Vim, and watch KaTeX render as you go. Share the link; everyone edits the same buffer in realtime. Ask `@vimothy` to rewrite an equation and the whole room sees the change.

> Not the Vim/Neovim LaTeX plugin `lervag/vimtex` — this is a browser-based web app.

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

Cloudflare room Worker (optional, alongside Next):

```bash
cp workers/collab/.dev.vars.example workers/collab/.dev.vars
npm run dev:cf
```

Then open **[http://127.0.0.1:3000](http://127.0.0.1:3000)**. Room HTTP is rewritten to Wrangler `:8787`; Yjs WebSockets go there directly. `npm run dev` / `npm start` stay on the Node full stack (`:3001`).

For local development (same custom server + Yjs WebSocket):

```bash
npm run dev
```

### Share outside localhost

**Option A — automatic (one command):**

```bash
npm start
# or: npm run dev:tunnel
```

Set `AUTO_TUNNEL=1` (or use `npm run start:tunnel` / `npm run dev:tunnel`). The server spawns `cloudflared` and prints a `https://*.trycloudflare.com` link when ready. Requires [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) on your PATH.

**Option B — manual second terminal:**

```bash
npm start
npm run tunnel   # needs cloudflared
```

Open the printed `https://*.trycloudflare.com` link on two devices with the same room — carets, edits, and chat sync live.

Quick tunnels get a **new URL every restart**. For a stable hostname you need a [named Cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (one-time account setup). If the app is already on a public host (VPS, Fly, etc.), you do **not** need a tunnel — use that URL directly.

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
| **Export** | `.tex` / `.md` / PDF; Studio Enhanced uses topbar **Import & Export** |

Type TeX directly — no `$` required for bare commands. Use `\(...\)` for inline and `\[...\]` for display when you want them.

---

## Room lifetime

- Reconnecting to the same `?room=` restores the shared Yjs doc while the Node process is up.
- **Cloudflare public beta:** new rooms live **30 days** (absolute TTL, renewable up to 30 days). “No expiry” is hidden/rejected on that deploy.
- Empty Node rooms (zero WebSocket clients) are garbage-collected after `YROOM_IDLE_MS` (default **30 minutes**).
- **Without** `YPERSISTENCE`, a Node server restart clears all rooms (in-memory only).
- **With** `YPERSISTENCE=/path/to/dir`, Node docs are stored in LevelDB (`y-leveldb`) and survive restarts. See `docs/RFC-collab-persistence.md`.
- Forge also keeps a **browser localStorage** copy per room as a solo refresh cache (not authoritative after sync).
- **Share → Copy edit / view-only link** upgrades the room to guest ACL. Edit links carry `#edit=`; view-only links carry `#view=` only (legacy `?edit=` / `?view=` still work once, then are stripped). Stripping a view capability does **not** grant edit. Before the first Share, bare `?room=` still edits (legacy). Recent Rooms store access locally so they reopen after a browser restart; clearing site data still loses guest ownership.
- **Share → Room settings** can set an optional PIN and absolute TTL. Password rooms require unlock once per browser session; expired rooms refuse WS joins.
- **History icon** (dock / toolbar / Forge rail) opens version checkpoints of the note. Restore replaces the live `codemirror` buffer for everyone in the room (server-applied).
- **Import & Export** (Studio Enhanced topbar Bloom; Basic/Forge Menu) covers `.tex` / `.md` import, LaTeX/Markdown/PDF export, and copy source.

---

## AI in the room

Toggle **Chat**, then mention **`@vimothy`**. Only the sender hits OpenRouter; everyone sees the reply and document patch via Yjs.

Copy [`.env.example`](.env.example) to `.env` or `.env.local` (gitignored) and set your key:

```bash
cp .env.example .env
# edit OPENROUTER_API_KEY=sk-or-v1-...
```

Restart after changing env. The key stays on the server (`POST /api/chat`) — never in the browser.

Models (sidebar dropdown) are grouped by provider:

- **OpenRouter** — free-tier models via `OPENROUTER_API_KEY` (default: Gemma 4 26B).
- **OpenCode** — free Zen models via `OPENCODE_API_KEY` (DeepSeek Flash, MiMo, Big Pickle, …).
- **Your key** — heavier OpenRouter models billed to a browser-stored key. See [`docs/AI_PROVIDERS.md`](docs/AI_PROVIDERS.md).

---

## Stack

Next.js · CodeMirror 6 · Yjs · KaTeX · OpenRouter · OpenCode Zen

---

## Planning and roadmap

Development is tracked on **[ChrisDc777/VimTex](https://github.com/ChrisDc777/VimTex)** (fork; upstream: [boscochanam/VimTex](https://github.com/boscochanam/VimTex)).

| Doc | Description |
|-----|-------------|
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased milestones M0–M5 |
| [docs/AI_ROADMAP.md](docs/AI_ROADMAP.md) | M3+ AI plan (Studio full vs Forge suggest-only) |
| [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) | **Start here** — shipped inventory + next-session prompt |
| [docs/RFC-collab-persistence.md](docs/RFC-collab-persistence.md) | Guest ACL / persistence (M2) |
| [docs/DEPLOYMENT_ARCHITECTURE.md](docs/DEPLOYMENT_ARCHITECTURE.md) | Tiers, swap contract, scale scopes |
| [docs/HISTORY.md](docs/HISTORY.md) | Version history architecture (Level A–E) |
| [docs/GITHUB_ISSUES.md](docs/GITHUB_ISSUES.md) | Issue index + backlog |
| [docs/PRODUCT_STRATEGY.md](docs/PRODUCT_STRATEGY.md) | Positioning and personas |
| [docs/UI_VARIANTS.md](docs/UI_VARIANTS.md) | Studio vs Forge shells |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Fork/upstream workflow |

---

## License

Private / experimental — use at your own risk. Ephemeral by design: don’t store secrets in the buffer.
