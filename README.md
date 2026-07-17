# VimTex

Ephemeral Vim + LaTeX scratchpad built with Next.js, CodeMirror 6 Vim, and KaTeX.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Modes

- **Split** (default) — source left, KaTeX preview right (stacked on mobile)
- **Realtime** — full-width Vim with inline KaTeX decorations

Notes are ephemeral: refresh clears the buffer. Export via `.tex` / `.md` in the top bar.
