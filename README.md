# VimTex

Ephemeral Vim + LaTeX scratchpad with **realtime collaboration**. Built with Next.js, CodeMirror 6 Vim, Yjs, and KaTeX.

## Run

```bash
npm install
npm run build
npm start
```

Open [http://localhost:3001](http://localhost:3001). Each visit gets a `?room=` id — share that URL (or hit **Share**) so others join the same buffer.

Dev (custom server with Yjs on the same port):

```bash
npm run dev
```

## Modes

- **Split** (default) — source left, KaTeX preview right (stacked on mobile)
- **Realtime** — full-width Vim with inline KaTeX decorations

## Collaboration

Yjs syncs the editor over a WebSocket on the same origin (`ws(s)://host/<room>`). Status and peer count show in the footer.

### Public tunnel (Cloudflare)

```bash
npm start
npm run tunnel
```

Open the printed `https://*.trycloudflare.com` URL in two browsers/devices with the same `?room=` — edits and carets sync live.
