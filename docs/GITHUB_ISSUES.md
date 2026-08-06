# GitHub issues index

**Repository:** [ChrisDc777/VimTex](https://github.com/ChrisDc777/VimTex)  
**Last synced:** 2026-08-06

> Studio = default shell; Forge = optional multi-tab workbench (`lib/ui-variant.ts`).

## Label conventions

| Prefix | Values |
|--------|--------|
| `priority:` | P0, P1, P2, P3 |
| `type:` | epic, feature, refactor, research, debt |
| `area:` | product, ui, editor, collaboration, ai, persistence, import-export, mobile, platform, security, business, docs |
| `size:` | XS, S, M, L, XL |

## Docs of record

| Doc | Purpose |
|-----|---------|
| [`ROADMAP.md`](./ROADMAP.md) | Milestone table |
| [`CURRENT_STATE.md`](./CURRENT_STATE.md) | What is shipped |
| [`RFC-collab-persistence.md`](./RFC-collab-persistence.md) | M2 collab / ACL (complete) |
| [`AI_ROADMAP.md`](./AI_ROADMAP.md) | M3+ AI plan, Studio vs Forge matrix |

---

## M0 / M1 — complete ✅

See closed milestones on GitHub. Epics [#1](https://github.com/ChrisDc777/VimTex/issues/1), [#12](https://github.com/ChrisDc777/VimTex/issues/12).

---

## M2 - Collaboration and persistence — complete ✅

**Epic:** [#19](https://github.com/ChrisDc777/VimTex/issues/19) (close on doc sync)

| # | Issue | Status |
|---|-------|--------|
| 20 | RFC collab/persistence | ✅ implemented (option A) |
| 21 | Reconnect UX | ✅ |
| 22 | Enhanced presence | ✅ |
| 23 | Read-only share links | ✅ |
| 24 | Room TTL + password | ✅ |
| 25 | Snapshots (modal) | ✅ |
| 71 | YPERSISTENCE LevelDB | ✅ |
| 80 | Guest edit/view capabilities | ✅ |

### Re-homed from M2

| # | Issue | Now |
|---|-------|-----|
| 79 | Docs-style history side panel | **M4** polish |
| 81 | Follow-user / presenter mode | Deferred post-M2 |
| 82 | Classroom mode discovery | **M5** |
| 78 | Claim guest room | **M5** (blocked on #37) |

---

## M3 - AI mathematical workflows

**Milestone epic:** [#26](https://github.com/ChrisDc777/VimTex/issues/26)  
**Studio checklist epic:** [#64](https://github.com/ChrisDc777/VimTex/issues/64)  
**Plan:** [`AI_ROADMAP.md`](./AI_ROADMAP.md)

### Wave A (exit-critical)

| # | Issue | Priority |
|---|-------|----------|
| 59 | Forge AI restrictions / feature gate | P0 |
| 27 | AI diff preview + accept/reject | P0 |
| 29 | Streaming, cancel, usage | P1 |

### Wave B–C (Studio depth) — filter `ai-roadmap`

| # | Issue |
|---|-------|
| 57 | Chat context levels |
| 28 | Selection-aware / inline actions |
| 53 | Diagnostics explain / fix |
| 54 | Multi-turn memory |
| 63 | Slash commands |
| 55 | Ghost text (Studio-only) |
| 58 | Chat-driven document actions |
| 52 | LaTeX template generation |
| 56 | Outline + TODO scanner |
| 62 | Grammar/style review |
| 61 | Citation completion |
| 60 | AI polish |
| 83 | Equation-scoped rewrite |
| 84 | Derivation coach (Forge-friendly) |
| 87 | Ranged AI patch format |
| 88 | CM line/gutter AI diff (after #87) |
| 89 | Optional snapshot on AI Accept |

---

## M4 - Import, export, and polish

**Epic:** [#30](https://github.com/ChrisDc777/VimTex/issues/30)

| # | Issue | Priority |
|---|-------|----------|
| 31 | Import LaTeX / Markdown | P1 |
| 32 | PDF / equation image export | P2 |
| 33 | Delight polish | P1 |
| 79 | Docs-style history panel | P2 |

---

## M5 - Production and SaaS readiness

**Epic:** [#34](https://github.com/ChrisDc777/VimTex/issues/34)  
**Gate:** retention proof before accounts/billing.

| # | Issue | Priority |
|---|-------|----------|
| 35 | Observability | P1 |
| 36 | Privacy-respecting analytics | P1 |
| 37 | RFC: Optional accounts | P3 |
| 38 | RFC: Billing | P3 |
| 78 | Claim guest room | P2 |
| 82 | Classroom mode | P3 |

---

## Maintenance scripts

- `scripts/issue-backlog.json` — canonical issue definitions
- `scripts/publish-github-backlog.mjs` — idempotent publish to GitHub
- `scripts/created-issues.json` — last publish output
