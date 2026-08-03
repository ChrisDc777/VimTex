# RFC: Naming conflict with lervag/vimtex

> Decision record for issue #11 (P2, type:research). Outcome: **keep the name**,
> differentiate the brand, revisit at commercialization.

## Background

- **lervag/vimtex** — "VimTeX: A modern Vim and neovim filetype plugin for LaTeX
  files." MIT licensed, ~6.3k stars, active since 2013. It is the dominant Vim
  plugin for LaTeX authoring and the top search hit for "vimtex".
- **This project (VimTex)** — a web-based, collaborative "Vim + LaTeX"
  scratchpad with CodeMirror Vim keybindings, live KaTeX rendering, and Yjs
  presence. It is not a Vim plugin and runs in the browser.

## The conflict

Identical stem ("vimtex") with different casing. Real consequences today:

1. **Search/brand collision** — "VimTeX" results are dominated by the plugin;
   discovery of this project suffers.
2. **Name confusion** — a Vim user looking for a LaTeX plugin may land here, and
   a web user may believe this is the plugin.
3. **No trademark/legal exposure** — neither project holds a registered mark,
   and both are open source. Low legal risk, purely reputational.

## Options considered

### A. Keep the name (recommended)

Differentiate with consistent, intentional branding:

- Canonical display name **"VimTeX"** (the plugin is "VimTeX" too, but the
  project already uses "VimTex"; pick one casing and use it everywhere).
- Lead messaging everywhere states the product type explicitly:
  "VimTeX — the browser-based collaborative LaTeX scratchpad" (distinct from a
  Vim plugin; note the repo README already positions it as a web scratchpad).
- Add a one-line README disambiguation: "Not the Vim/Neovim LaTeX plugin
  `lervag/vimtex`; this is a web app."

Cost: minimal (copy, OG metadata already exist). Risk: collision remains.

### B. Rename the product

e.g. "ViTeX", "TeXScribe", "TeXode", "MathPad". Kills collision but costs real
effort: GitHub repo rename + redirect, package names, docs, OG/metadata, and any
published references. No downside today is severe enough to justify it.

### C. Sub-brand ("VimTeX Studio")

A distinct product name reduces search overlap while keeping lineage. Cheap-ish
but implies a renaming commitment without solving discovery any better than A
plus strong positioning.

## Decision

**Option A — keep the name**, with these concrete steps:

1. **Canonicalize on the existing "VimTex" casing** — the codebase, README, and
   OG metadata already use "VimTex" consistently; keep it (the plugin's "VimTeX"
   casing is thus visually distinct). Lock it in so mixed spellings don't creep
   in.
2. Add a README disambiguation line (see below).
3. Revisit before any public commercial launch: do a trademark search on
   "VimTeX" then; if entering a marketplace, re-evaluate B/C with real
   trademark counsel.

## Follow-ups (small)

- [x] Add disambiguation sentence to README (done in this PR).
- [ ] Keep casing consistent ("VimTex") in new copy — no mechanical rename.
