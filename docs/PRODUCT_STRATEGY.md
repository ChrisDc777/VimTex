# VimTex — Product strategy

## One-line pitch

**The fastest way for two math-fluent keyboard users to work through equations together live.**

## Positioning

VimTex is **not** Overleaf, HackMD, Google Docs, or Obsidian. It is an **instant multiplayer math scratchpad**: open a link, type TeX with Vim (or standard keys), see KaTeX live, collaborate in realtime, and optionally invoke `@ai` — without project setup or accounts.

### Wedge (primary)

**Collaborative math scratchpad** — ephemeral-to-semi-persistent rooms for synchronous problem solving.

### Differentiation (secondary)

**Multiplayer Vim math workspace** — keyboard-first, source-faithful, modal editing for power users.

### North star (later)

**AI-assisted mathematical thinking** — only after edits are reviewable, scoped, and reversible.

## Target personas

| Persona | Fit | Notes |
|---------|-----|-------|
| STEM students / study pairs | Primary | Share link, co-edit homework, export handoff |
| TAs / tutors (office hours) | Primary | Live room + optional problem-image reference |
| Quant / ML engineers pairing on math | Primary | Vim speed, exact TeX source |
| Researchers (informal) | Secondary | Not for publication pipeline |
| Technical interviewers | Secondary | Needs AI-off mode + audit later |
| General non-Vim users | Secondary | Requires standard editing mode + onboarding |
| Manuscript authors | Poor fit | Use Overleaf; export handoff only |

## Jobs to be done

1. **Start a shared math session in under 60 seconds** — no install, no account.
2. **Type and see math render immediately** — inline or split preview.
3. **Co-edit with presence** — carets, names, peer count, room chat.
4. **Get AI help without leaving the buffer** — `@ai` with document context.
5. **Leave with an artifact** — `.tex` / `.md` export, copy, or saved room.

## Product principles

1. **Session-first** — optimize the live room, not the document library.
2. **Source fidelity** — TeX stays editable; rendering serves thinking, not publishing.
3. **Vim-first, not Vim-only** — Vim is the signature mode; standard editing unlocks growth.
4. **Honest ephemerality** — say what happens on refresh, TTL, and server restart.
5. **AI as copilot** — suggest and patch; human accepts; never silent overwrite.
6. **Shell ≠ collaboration** — UI variant and live share are independent toggles.

## Success metrics

**North-star:** Weekly collaborative math sessions with ≥2 active editors.

| Metric | Why |
|--------|-----|
| Time to second peer join | Viral loop health |
| % rooms with 2+ editors | Collaboration activation |
| Reconnect success rate | Trust |
| Export / copy rate | Value delivered |
| 7-day room return (local or server) | Retention signal |
| AI suggestion accept vs reject vs revert | AI quality |

## Non-goals (explicit)

- Full LaTeX compiler / multi-file projects / BibTeX ecosystem
- Notion-style blocks or Obsidian vault / graph
- Native mobile apps (mobile web is enough for v1)
- Billing before collaborative retention is proven
- Autonomous AI agents
- Competing with VimTeX plugin ([lervag/vimtex](https://github.com/lervag/vimtex)) on naming — see rebrand RFC

## Naming / rebrand

**VimTex** collides with the established [VimTeX](https://github.com/lervag/vimtex) Neovim plugin (6k+ stars, vimtex.org). For SEO and confusion avoidance, plan a future rebrand discussion (issue) — do **not** rename in code until decided.

## Competitive frame

| | Overleaf | HackMD | Excalidraw | **VimTex** |
|--|----------|--------|------------|------------|
| Setup | Heavy | Light | Zero | Zero |
| Math | Full TeX | Mixed | Drawing | Live KaTeX |
| Vim | No | No | No | Native |
| Collab | Strong | Strong | Strong | Room link |
| AI | Growing | Limited | No | In-room `@ai` |

**Message:** *Derive in VimTex; publish in Overleaf.*
