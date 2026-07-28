# Contributing to VimTex (ChrisDc777 fork)

## Repository layout

| Remote | URL | Role |
|--------|-----|------|
| **origin** (target) | `https://github.com/ChrisDc777/VimTex` | Push, PRs, issues, releases |
| **upstream** | `https://github.com/boscochanam/VimTex` | Read-only sync reference |

Recommended local remotes:

```bash
git remote rename origin upstream   # if origin still points at boscochanam
git remote add origin https://github.com/ChrisDc777/VimTex.git
git fetch origin
```

## Branch strategy

- `master` — integration branch on the fork (currently at redesign commit `a9e090a`).
- `classic-default` — future branch restoring Classic Collaborative shell as default while cherry-picking reusable modules from redesign.
- Feature branches: `feat/<issue-number>-short-name` from `master` or `classic-default` as directed by the issue.

## UI direction

- **Default shell:** Classic Collaborative (local `edf2935` aesthetic) — live share, split/realtime, header toolbar.
- **Optional shell:** Quiet Craft (redesign `a9e090a` workspace) — tabs, rails, problem panel, mobile bottom nav.
- **Separate concern:** `collaborationEnabled` — never tie Quiet Craft to local-only mode.

## Dependencies and lockfiles

- **npm** is the lockfile source of truth — use `npm install` and commit `package-lock.json` when dependencies change.
- `bun.lock` is gitignored; do not commit it.

## Before opening a PR

1. Link the GitHub issue.
2. Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`.
3. Note which UI variant(s) were tested.
4. Do not commit secrets or `.env`.

## Syncing from upstream

```bash
git fetch upstream
git log --oneline HEAD..upstream/master   # see what's new
# Cherry-pick or merge selectively — do not blind-merge if it regresses Classic default.
```
