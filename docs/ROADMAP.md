# VimTex — Implementation roadmap

Phased delivery for [ChrisDc777/VimTex](https://github.com/ChrisDc777/VimTex). **Studio remains default.**

## Milestones overview

| Milestone | Theme | Target | Exit criteria |
|-----------|-------|--------|---------------|
| **M0** | Foundation + UI convergence | 2026-Q3 | ✅ Studio default, shared layer, CI, truthful room semantics |
| **M1** | Editing + activation | 2026-Q4 | ✅ Non-Vim mode, onboarding, templates, command palette |
| **M2** | Collab + persistence | 2027-Q1 | ✅ Permissions, reconnect, snapshots, guest capabilities |
| **M3** | AI workflows | 2027-Q1–Q2 | Diff accept/reject, scoped actions, streaming — see `docs/AI_ROADMAP.md` |
| **M4** | Import/export + polish | 2027-Q2 | ✅ PDF, equation images, import, delight UX, history panel |
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

**M1 exit:** Non-Vim invitee can type in 30s; share loop feels complete. ✅

---

## M2 — Collaboration and persistence

| Priority | Issue theme | Size | Status |
|----------|-------------|------|--------|
| P0 | Collab/persistence architecture RFC | M | ✅ `#20` / `docs/RFC-collab-persistence.md` |
| P0 | Reconnect UX + offline banner | S | ✅ `#21` |
| P1 | Named peer list + join/leave events | S | ✅ `#22` |
| P1 | Selection ranges + typing indicator | M | ✅ `#22` |
| P1 | Read-only share links | M | ✅ `#23` |
| P1 | Room TTL + optional password | M | ✅ `#24` |
| P1 | Guest edit capability tokens | M | ✅ `#80` (mint on create; no view escalation) |
| P1 | Optional LevelDB (`YPERSISTENCE`) | M | ✅ `#71` |
| P2 | Snapshots + version history UI | L | ✅ `#25` store; Docs-style panel `#79` shipped (Level A–B) |
| P2 | Follow-user / presenter mode | M | ⏸️ Deferred → `#81` (post-M2) |
| P3 | Classroom mode discovery | L | ⏸️ Deferred → M5 `#82` |

**M2 exit:** Session survives brief disconnect; owner can share view-only link. ✅

**Explicitly not blocking M2 close:** follow/presenter (#81), classroom (#82), claim-guest (#78 / accounts). History rail (#79) shipped later in M4.

---

## M3 — AI mathematical workflows

**Plan of record:** [`docs/AI_ROADMAP.md`](./AI_ROADMAP.md) (Studio full AI vs Forge suggest-only).

| Priority | Issue theme | Size | Tracking |
|----------|-------------|------|----------|
| P0 | AI feature gate (Forge cannot mutate) | S | `#59` |
| P0 | AI diff preview + accept/reject | L | `#27` |
| P0 | @ai concurrency guard / queue | S | with `#29` / `#26` |
| P1 | Selection-scoped AI actions | M | `#28` |
| P1 | Explain / simplify / fix TeX actions | M | `#28` / `#53` |
| P1 | Streaming responses + cancel | M | `#29` (elevated for UX) |
| P2 | AI edit undo checkpoint / auto-snapshot | M | uses `#25` |
| P2 | Studio depth (slash, ghost, memory, context…) | L | `#64` checklist |
| P3 | OCR / image-to-LaTeX | L | — |
| P3 | Graphing spike | L | — |

**M3 exit:** No silent full-document overwrite; users can reject AI patches; Forge stays suggest-only.

**Tracking:** Milestone epic `#26`; detailed Studio checklist `#64`.

---

## M4 — Import, export, and polish — complete ✅

| Priority | Issue theme | Size | Notes |
|----------|-------------|------|-------|
| P1 | Copy as TeX / Markdown / rendered equation | S | ✅ |
| P1 | Import .md / .tex | M | ✅ `#31` |
| P1 | Toasts, empty states, reconnect polish | S | ✅ `#33` |
| P2 | Docs-style version history side panel | M | ✅ `#79` Level A–B (PR #131); Level C+ → `#126`–`#128` |
| P2 | PNG/SVG/MathML per equation | M | ✅ `#32` (+ paint snapshot #144); MathML not shipped |
| P2 | PDF export (print or server render) | L | ✅ print-to-PDF `#32` |
| P2 | Overleaf handoff RFC | XS | ✅ `.tex` wrapper shipped |

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

**Wave 2 (landed):** Forge toggle, onboarding, standard editing mode, templates, recent rooms, command palette, preferences dialog.

**Wave 3 (M2 — landed):** LevelDB optional persistence, read-only + edit capabilities, room TTL/password, snapshot store, reconnect/presence.

**M3 Level A (landed):** AI accept/reject + Studio/Forge gate — [`docs/AI_ROADMAP.md`](./AI_ROADMAP.md).

**M4 (landed):** import/export, PDF, equation images, polish, Docs-style history — epic [#30](https://github.com/ChrisDc777/VimTex/issues/30) closed.

**Next:** AI polish [#60](https://github.com/ChrisDc777/VimTex/issues/60); optional History Phase 2 (editor time-travel); see [`CURRENT_STATE.md`](./CURRENT_STATE.md).

See [GITHUB_ISSUES.md](./GITHUB_ISSUES.md) for issue index.
