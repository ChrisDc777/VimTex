# GitHub issues index

**Repository:** [ChrisDc777/VimTex](https://github.com/ChrisDc777/VimTex)  
**Milestones:** M0–M5 (6) | **Issues:** 38 (6 epics + 32 implementation/RFC)  
**Last synced:** 2026-08-02

> **Note:** Issue titles below were written under the original naming — "Classic Collaborative" is now **Studio** and "Quiet Craft" is now **Forge** (`lib/ui-variant.ts`). The issues themselves are unchanged on GitHub.

## Label conventions

| Prefix | Values |
|--------|--------|
| `priority:` | P0, P1, P2, P3 |
| `type:` | epic, feature, refactor, research, debt |
| `area:` | product, ui, editor, collaboration, ai, persistence, import-export, mobile, platform, security, business, docs |
| `size:` | XS, S, M, L, XL |

## Recommended execution order (Wave 1)

| Order | Issue | Why |
|-------|-------|-----|
| 1 | [#2](https://github.com/ChrisDc777/VimTex/issues/2) Governance | Correct remotes + CONTRIBUTING |
| 2 | [#3](https://github.com/ChrisDc777/VimTex/issues/3) Cross-platform scripts | Unblocks Windows dev + CI |
| 3 | [#4](https://github.com/ChrisDc777/VimTex/issues/4) Room lifetime | Honest product promise |
| 4 | [#5](https://github.com/ChrisDc777/VimTex/issues/5) Workspace controller | Unblocks shell work |
| 5 | [#9](https://github.com/ChrisDc777/VimTex/issues/9) CI + API limits | Safety net for changes |
| 6 | [#6](https://github.com/ChrisDc777/VimTex/issues/6) Classic default | Core product restoration |
| 7 | [#8](https://github.com/ChrisDc777/VimTex/issues/8) Bare-math parser | Low-risk delight win |
| 8 | [#10](https://github.com/ChrisDc777/VimTex/issues/10) Two-client E2E | Proves collab works |
| 9 | [#18](https://github.com/ChrisDc777/VimTex/issues/18) Share polish | Viral loop |
| 10 | [#7](https://github.com/ChrisDc777/VimTex/issues/7) Quiet Craft toggle | Optional shell (Wave 1b) |

---

## M0 - Foundation and UI convergence

**Epic:** [#1](https://github.com/ChrisDc777/VimTex/issues/1)

| # | Issue | Priority | Size |
|---|-------|----------|------|
| 2 | [Configure fork remotes and contribution workflow](https://github.com/ChrisDc777/VimTex/issues/2) | P0 | XS |
| 3 | [Cross-platform dev scripts and lockfile policy](https://github.com/ChrisDc777/VimTex/issues/3) | P0 | S |
| 4 | [Define truthful room lifetime and idle cleanup](https://github.com/ChrisDc777/VimTex/issues/4) | P0 | S |
| 5 | [Extract shared workspace controller and document buffer](https://github.com/ChrisDc777/VimTex/issues/5) | P0 | L |
| 6 | [Restore Classic Collaborative as default shell](https://github.com/ChrisDc777/VimTex/issues/6) | P0 | L |
| 7 | [Add optional Quiet Craft UI variant toggle](https://github.com/ChrisDc777/VimTex/issues/7) | P1 | M |
| 8 | [Merge bare-math parser and render improvements](https://github.com/ChrisDc777/VimTex/issues/8) | P1 | M |
| 9 | [Port CI, typecheck, and API rate limits from redesign](https://github.com/ChrisDc777/VimTex/issues/9) | P1 | S |
| 10 | [Add two-client collaboration E2E tests](https://github.com/ChrisDc777/VimTex/issues/10) | P1 | M |
| 11 | [RFC: VimTex naming conflict with lervag/vimtex plugin](https://github.com/ChrisDc777/VimTex/issues/11) | P2 | XS |

**Dependencies:** #6 blocked by #5. #7 blocked by #5, #6. #10 blocked by #9.

---

## M1 - Core editing and activation

**Epic:** [#12](https://github.com/ChrisDc777/VimTex/issues/12)

| # | Issue | Priority | Size |
|---|-------|----------|------|
| 13 | [Define canonical Markdown+TeX document format](https://github.com/ChrisDc777/VimTex/issues/13) | P0 | M |
| 14 | [Add standard (non-Vim) editing mode](https://github.com/ChrisDc777/VimTex/issues/14) | P0 | M |
| 15 | [First-run onboarding and Vim cheatsheet](https://github.com/ChrisDc777/VimTex/issues/15) | P0 | S |
| 16 | [Session templates and recent rooms](https://github.com/ChrisDc777/VimTex/issues/16) | P1 | S |
| 17 | [Command palette for workspace actions](https://github.com/ChrisDc777/VimTex/issues/17) | P1 | M |
| 18 | [Share and export UX polish](https://github.com/ChrisDc777/VimTex/issues/18) | P1 | S |

---

## M2 - Collaboration and persistence

**Epic:** [#19](https://github.com/ChrisDc777/VimTex/issues/19)

| # | Issue | Priority | Size |
|---|-------|----------|------|
| 20 | [RFC: Production collaboration and persistence architecture](https://github.com/ChrisDc777/VimTex/issues/20) | P0 | M |
| 21 | [Reconnect UX and offline editing banner](https://github.com/ChrisDc777/VimTex/issues/21) | P0 | S |
| 22 | [Enhanced presence: peer list, selections, typing indicator](https://github.com/ChrisDc777/VimTex/issues/22) | P1 | M |
| 23 | [Permission-aware share links (read-only)](https://github.com/ChrisDc777/VimTex/issues/23) | P1 | M |
| 24 | [Room TTL, expiry, and optional password](https://github.com/ChrisDc777/VimTex/issues/24) | P1 | M |
| 25 | [Snapshots and version history](https://github.com/ChrisDc777/VimTex/issues/25) | P2 | L |

---

## M3 - AI mathematical workflows

**Epic:** [#26](https://github.com/ChrisDc777/VimTex/issues/26)

| # | Issue | Priority | Size |
|---|-------|----------|------|
| 27 | [AI diff preview with accept/reject workflow](https://github.com/ChrisDc777/VimTex/issues/27) | P0 | L |
| 28 | [Selection-aware and inline AI actions](https://github.com/ChrisDc777/VimTex/issues/28) | P1 | M |
| 29 | [AI streaming, cancel, and usage quotas](https://github.com/ChrisDc777/VimTex/issues/29) | P2 | M |

**Dependencies:** #28 blocked by #27.

---

## M4 - Import, export, and polish

**Epic:** [#30](https://github.com/ChrisDc777/VimTex/issues/30)

| # | Issue | Priority | Size |
|---|-------|----------|------|
| 31 | [Import LaTeX and Markdown files](https://github.com/ChrisDc777/VimTex/issues/31) | P1 | M |
| 32 | [PDF export and equation image export](https://github.com/ChrisDc777/VimTex/issues/32) | P2 | L |
| 33 | [Delight polish: toasts, empty states, metadata](https://github.com/ChrisDc777/VimTex/issues/33) | P1 | S |

---

## M5 - Production and SaaS readiness

**Epic:** [#34](https://github.com/ChrisDc777/VimTex/issues/34)  
**Gate:** Start accounts/billing only after collaborative retention is proven.

| # | Issue | Priority | Size |
|---|-------|----------|------|
| 35 | [Observability: structured logging and error tracking](https://github.com/ChrisDc777/VimTex/issues/35) | P1 | M |
| 36 | [Privacy-respecting product analytics](https://github.com/ChrisDc777/VimTex/issues/36) | P1 | M |
| 37 | [RFC: Optional accounts and saved workspaces](https://github.com/ChrisDc777/VimTex/issues/37) | P3 | L |
| 38 | [RFC: Billing, entitlements, and subscription tiers](https://github.com/ChrisDc777/VimTex/issues/38) | P3 | M |

---

## Maintenance scripts

- `scripts/issue-backlog.json` — canonical issue definitions
- `scripts/publish-github-backlog.mjs` — idempotent publish to GitHub
- `scripts/created-issues.json` — last publish output

To re-publish (skips existing titles):

```bash
node scripts/publish-github-backlog.mjs
```
