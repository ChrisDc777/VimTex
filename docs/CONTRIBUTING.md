# Contributing to VimTex (ChrisDc777 fork)

## Repository layout

| Remote | URL | Role |
|--------|-----|------|
| **origin** (target) | `https://github.com/ChrisDc777/VimTex` | Push, PRs, issues, releases |
| **upstream** | `https://github.com/boscochanam/VimTex` | Read-only reference |

## Branch strategy

- `main` — integration branch on the fork; tracks `origin/main`.
- Feature branches: `feat/<issue-number>-short-name`, `fix/...`, `chore/...` from `main`.
- Merge via PR against the fork's own `main` (do not target upstream).

## UI direction

- **Default shell:** Studio (`.ui-studio` + `app/studio-theme.css`) — live share, split/live preview, command palette, pill controls.
- **Optional shell:** Forge (base `:root` tokens) — tabs, rails, unified Problem/Preview/Chat/History panel, mobile bottom nav.
- **Separate concern:** both shells collaborate; never tie a shell to local-only mode.

## Dependencies and lockfiles

- **npm** is the lockfile source of truth — use `npm install` and commit `package-lock.json` when dependencies change.
- `bun.lock` is gitignored; do not commit it.

## Before opening a PR

1. Link the GitHub issue.
2. Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`.
3. Note which UI variant(s) were tested.
4. Do not commit secrets or `.env`.

## Syncing from upstream

The fork and upstream have **no shared commit history** (rewritten on either side), so treat upstream as a read-only reference, not a merge source.

```bash
git fetch upstream
git log --oneline upstream/master -10   # review for useful ideas/features
```

To adopt an upstream feature:

1. Study the upstream commit/diff.
2. Port it into the Studio/Forge architecture manually on a fork feature branch.
3. Open a PR against the fork's `main`.

Do **not** `git merge upstream/master` or blind cherry-pick — the file layouts diverged (Studio/Forge vs upstream's shells) and will conflict heavily.

Upstream may still use `master` as its default branch; the fork's integration branch is `main`.
