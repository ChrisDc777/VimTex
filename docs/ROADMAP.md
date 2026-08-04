# VimTex — Implementation roadmap

Phased delivery for [ChrisDc777/VimTex](https://github.com/ChrisDc777/VimTex). **Studio remains default.**

## Milestones overview

| Milestone | Theme | Target | Exit criteria |
|-----------|-------|--------|---------------|
| **M0** | Foundation + UI convergence | 2026-Q3 | ✅ Studio default, shared layer, CI, truthful room semantics |
| **M1** | Editing + activation | 2026-Q4 | 🔄 Non-Vim mode, onboarding, templates, command palette — mostly landed |
| **M2** | Collab + persistence | 2027-Q1 | Permissions, reconnect, snapshots, history |
| **M3** | AI workflows | 2027-Q1–Q2 | Diff accept/reject, scoped actions, streaming |
| **M4** | Import/export + polish | 2027-Q2 | PDF, copy equation, import, delight UX |
| **M5** | Production + SaaS | 2027-H1+ | Auth, observability, billing — gated on retention |

---

## M0 — Foundation and UI convergence

| Priority | Issue theme | Size | Depends on |
|----------|-------------|------|------------|
| P0 | Fork governance + CONTRIBUTING | XS | — |
| P0 | Cross-platform scripts + lockfile policy | S | — |
| P0 | Truthful room lifetime + idle GC | S | — |
| P0 | Extract workspace controller / document buffer | L | — |
| P0 | Studio shell as default on integration branch | L | workspace layer |
| P1 | Forge optional shell toggle | M | workspace layer |
| P1 | Merge render-note improvements (bare math) | M | — |
| P1 | Port CI, typecheck, API limits from redesign | S | — |
| P1 | Two-client collab E2E + Playwright webServer | M | CI |
| P2 | Naming/rebrand RFC (discussion) | XS | — |
| P2 | Product analytics spec (privacy-first) | S | — |

**M0 exit:** Two browsers edit same room on Studio default; refresh behavior documented; CI green. ✅

---

## M1 — Core editing and activation

| Priority | Issue theme | Size |
|----------|-------------|------|
| P0 | Canonical Markdown+TeX format spec | M |
| P0 | Standard editing mode (non-Vim) | M |
| P0 | First-run onboarding + Vim cheatsheet | S |
| P1 | Session templates (blank, homework, derivation) | S |
| P1 | Recent rooms (localStorage) | S |
| P1 | Command palette (`/share`, `/export`, `/ai`) | M |
| P1 | Share toast + URL fallback + invite copy | S |
| P2 | Symbol picker + snippet expansion | M |
| P2 | Math error diagnostics (line/col) | M |
| P2 | Incremental render / debounce tuning | S |

**M1 exit:** Non-Vim invitee can type in 30s; share loop feels complete.

---

## M2 — Collaboration and persistence

| Priority | Issue theme | Size |
|----------|-------------|------|
| P0 | Collab/persistence architecture RFC | M |
| P0 | Reconnect UX + offline banner | S | ✅ landed early |
| P1 | Named peer list + join/leave events | S | ✅ presence chips / peers |
| P1 | Selection ranges + typing indicator | M | ✅ typing via awareness |
| P1 | Read-only share links | M |
| P1 | Room TTL + optional password | M |
| P2 | Follow-user / presenter mode | M |
| P2 | Snapshots + version history UI | L |
| P3 | Classroom mode discovery | L |

**M2 exit:** Session survives brief disconnect; owner can share view-only link.

---

## M3 — AI mathematical workflows

| Priority | Issue theme | Size |
|----------|-------------|------|
| P0 | AI diff preview + accept/reject | L |
| P0 | @ai concurrency guard / queue | S |
| P1 | Selection-scoped AI actions | M |
| P1 | Explain / simplify / fix TeX actions | M |
| P2 | Streaming responses + cancel | M |
| P2 | AI edit undo checkpoint | M |
| P3 | OCR / image-to-LaTeX | L |
| P3 | Graphing spike | L |

**M3 exit:** No silent full-document overwrite; users can reject AI patches.

---

## M4 — Import, export, and polish

| Priority | Issue theme | Size |
|----------|-------------|------|
| P1 | Copy as TeX / Markdown / rendered equation | S |
| P1 | Import .md / .tex | M |
| P2 | PNG/SVG/MathML per equation | M |
| P2 | PDF export (print or server render) | L |
| P2 | Overleaf handoff RFC | XS |
| P1 | Toasts, empty states, reconnect polish | S |

---

## M5 — Production and SaaS readiness

| Priority | Issue theme | Size | Gate |
|----------|-------------|------|------|
| P1 | Structured logging + error tracking | M | M2 |
| P1 | Privacy-respecting analytics | M | M1 |
| P2 | Optional accounts + saved rooms | L | retention proof |
| P2 | Production Yjs service + backups | L | RFC |
| P3 | Teams / classrooms | XL | accounts |
| P3 | Billing + entitlements | L | usage data |

---

## Deferred (do not build until validated)

- Full LaTeX compiler / multi-file projects
- BibTeX, journal templates, track changes
- Notion blocks, Obsidian graph
- Native iOS/Android apps
- Autonomous multi-agent rooms
- Enterprise SSO before customer pull

---

## Wave 1 proposal (for founder review) — delivered ✅

**Theme:** Make the fork trustworthy and shippable without feature sprawl.

1. **Governance** — remotes, CONTRIBUTING, enable Issues ✅
2. **Platform hygiene** — cross-env scripts, Playwright webServer, lockfile policy
3. **Truthful sessions** — document + implement room TTL / idle GC; fix README
4. **Workspace extraction** — shared hooks, decouple note state from Yjs double-fire
5. **Studio default branch** — restore collab-first shell on fork integration branch
6. **Cherry-pick wins** — render-note bare math, API limits, CI
7. **Collab E2E** — two Playwright contexts, same room
8. **Share polish** — copy toast, visible URL on failure

**Explicitly not in Wave 1:** accounts, billing, Forge default, PDF, full AI diff UI, Redis/Hocuspocus.

**Wave 2 (landed):** Forge toggle, onboarding, standard editing mode, templates, recent rooms, command palette, preferences dialog. **Remaining:** AI accept/reject diff UX.

See [GITHUB_ISSUES.md](./GITHUB_ISSUES.md) for issue index (populated after GitHub sync).
