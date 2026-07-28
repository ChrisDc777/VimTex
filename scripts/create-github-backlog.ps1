# GitHub issue backlog definitions for ChrisDc777/VimTex
# Run: pwsh scripts/create-github-backlog.ps1

@(
  @{
    title = "Epic: M0 — Foundation and UI convergence"
    milestone = "M0 — Foundation and UI convergence"
    labels = "type:epic,priority:P0,area:platform,size:L"
    body = @"
## Problem
Local Classic UI and fork Quiet Craft redesign diverged; collaboration is disabled on fork; foundation work must land before feature growth.

## Scope
Governance, room semantics, shared workspace layer, Classic default, selective redesign integration, CI/E2E.

## Acceptance criteria
- [ ] All M0 child issues linked below are tracked
- [ ] Classic Collaborative is default on integration branch
- [ ] Two-browser collab E2E passes in CI

## Child issues
_(Updated after issue creation)_

## Estimate
**Size:** L | **Priority:** P0
"@
  }
  @{
    title = "Configure fork remotes and contribution workflow"
    milestone = "M0 — Foundation and UI convergence"
    labels = "type:debt,priority:P0,area:platform,size:XS,area:docs"
    body = @"
## Problem
Local ``origin`` may still point at boscochanam; ChrisDc777 fork should be the push/PR target.

## Acceptance criteria
- [ ] ``docs/CONTRIBUTING.md`` documents origin/upstream remotes and branch strategy
- [ ] README links to planning docs
- [ ] Team uses ``ChrisDc777/VimTex`` for issues and PRs

## Implementation notes
Do not force-reset local Classic commit; document integration branch approach.

## Estimate
**Size:** XS | **Priority:** P0
"@
  }
  @{
    title = "Cross-platform dev scripts and lockfile policy"
    milestone = "M0 — Foundation and UI convergence"
    labels = "type:debt,priority:P0,area:platform,size:S"
    body = @"
## Problem
``npm run dev`` uses Unix ``NODE_ENV=`` syntax (fails on Windows PowerShell). Untracked ``bun.lock`` conflicts with npm lockfile.

## Acceptance criteria
- [ ] ``cross-env`` or equivalent for dev/start scripts
- [ ] ``npm run typecheck`` script added (from redesign)
- [ ] Single lockfile policy documented; ``bun.lock`` gitignored or removed
- [ ] Remove or justify unused deps (``@codemirror/lang-markdown``, ``concurrently``)

## Estimate
**Size:** S | **Priority:** P0
"@
  }
  @{
    title = "Define truthful room lifetime and idle cleanup"
    milestone = "M0 — Foundation and UI convergence"
    labels = "type:feature,priority:P0,area:collaboration,area:persistence,size:S"
    body = @"
## Problem
README claims refresh clears the slate, but Yjs rooms persist in server memory indefinitely.

## Acceptance criteria
- [ ] Product copy matches behavior (ephemeral TTL vs reconnect-restore)
- [ ] Idle rooms GC'd after configurable TTL
- [ ] Document server restart behavior
- [ ] Optional: stronger room IDs (≥128 bits)

## Implementation notes
See ``scripts/y-ws/utils.js`` — docs only destroyed when persistence enabled today.

## Estimate
**Size:** S | **Priority:** P0
"@
  }
  @{
    title = "Extract shared workspace controller and document buffer"
    milestone = "M0 — Foundation and UI convergence"
    labels = "type:refactor,priority:P0,area:ui,area:editor,size:L"
    body = @"
## Problem
``app/page.tsx`` and ``VimEditor`` duplicate note state; shells cannot share logic.

## Acceptance criteria
- [ ] Single source of truth for document text (Yjs ytext)
- [ ] Hooks: room, collab status, chat subscription, AI invoke
- [ ] ``VimEditor`` accepts ``collaborationEnabled`` and ``inlineMath`` props
- [ ] No duplicate ``onChange`` paths

## Dependencies
Blocks: Classic default shell, Quiet Craft toggle

## Estimate
**Size:** L | **Priority:** P0
"@
  }
  @{
    title = "Restore Classic Collaborative as default shell"
    milestone = "M0 — Foundation and UI convergence"
    labels = "type:feature,priority:P0,area:ui,size:L"
    body = @"
## Problem
Fork ``a9e090a`` disables live share and hides collaboration UI.

## Acceptance criteria
- [ ] Default UI matches Classic: Share, Chat, Split/Realtime, name picker
- [ ] ``WebsocketProvider`` ``connect: true`` by default
- [ ] Remove fake Premium gate on Share/Chat
- [ ] xAI-inspired Classic styles remain default

## Dependencies
Blocked by: workspace controller extraction

## Estimate
**Size:** L | **Priority:** P0
"@
  }
  @{
    title = "Add optional Quiet Craft UI variant toggle"
    milestone = "M0 — Foundation and UI convergence"
    labels = "type:feature,priority:P1,area:ui,size:M"
    body = @"
## Problem
Redesign workspace (tabs, rails, problem panel) should remain available without becoming default.

## Acceptance criteria
- [ ] ``uiVariant: classic | quietCraft`` persisted in localStorage
- [ ] Quiet Craft shell uses shared workspace layer
- [ ] Collaboration works in both variants
- [ ] Test matrix in ``docs/UI_VARIANTS.md`` covered by E2E smoke

## Dependencies
Blocked by: workspace controller, Classic default

## Estimate
**Size:** M | **Priority:** P1
"@
  }
  @{
    title = "Merge bare-math parser and render improvements"
    milestone = "M0 — Foundation and UI convergence"
    labels = "type:feature,priority:P1,area:editor,size:M"
    body = @"
## Problem
Fork adds ``2^5`` inline parsing and tests; Classic uses line-based heuristics only.

## Acceptance criteria
- [ ] Unified ``lib/render-note.ts`` supports explicit delimiters + bare math + line display
- [ ] ``lib/render-note.test.mjs`` (or Vitest) in CI
- [ ] Realtime widgets and split preview behave consistently

## Estimate
**Size:** M | **Priority:** P1
"@
  }
  @{
    title = "Port CI, typecheck, and API rate limits from redesign"
    milestone = "M0 — Foundation and UI convergence"
    labels = "type:debt,priority:P1,area:platform,area:security,size:S"
    body = @"
## Problem
Local baseline lacks CI workflow, typecheck script, chat middleware limits.

## Acceptance criteria
- [ ] ``.github/workflows/ci.yml`` — lint, typecheck, build, e2e
- [ ] ``middleware.ts`` rate limit + payload caps on ``/api/chat``
- [ ] ``.env.example`` documented

## Estimate
**Size:** S | **Priority:** P1
"@
  }
  @{
    title = "Add two-client collaboration E2E tests"
    milestone = "M0 — Foundation and UI convergence"
    labels = "type:feature,priority:P1,area:collaboration,area:platform,size:M"
    body = @"
## Problem
No automated test proves multi-peer sync, carets, or chat.

## Acceptance criteria
- [ ] Playwright ``webServer`` starts ``server.mjs``
- [ ] Two contexts join same room; edit propagates both ways
- [ ] Chat message visible to peer
- [ ] Runs in CI

## Dependencies
Blocked by: CI workflow

## Estimate
**Size:** M | **Priority:** P1
"@
  }
  @{
    title = "RFC: VimTex naming conflict with lervag/vimtex plugin"
    milestone = "M0 — Foundation and UI convergence"
    labels = "type:research,priority:P2,area:product,size:XS"
    body = @"
## Problem
Name collides with popular VimTeX plugin (vimtex.org, 6k+ GitHub stars).

## Acceptance criteria
- [ ] Discussion issue captures rename options, SEO impact, migration cost
- [ ] No code rename until decision recorded
- [ ] README acknowledges potential confusion

## Non-goals
Implementing rebrand in this issue.

## Estimate
**Size:** XS | **Priority:** P2
"@
  }
  @{
    title = "Epic: M1 — Core editing and activation"
    milestone = "M1 — Core editing and activation"
    labels = "type:epic,priority:P0,area:product,size:L"
    body = @"
## Scope
Canonical format, non-Vim mode, onboarding, templates, command palette, share/export wins.

## Acceptance criteria
- [ ] Non-Vim user can type within 30s of opening link
- [ ] All M1 child issues linked

## Estimate
**Size:** L | **Priority:** P0
"@
  }
  @{
    title = "Define canonical Markdown+TeX document format"
    milestone = "M1 — Core editing and activation"
    labels = "type:research,priority:P0,area:editor,size:M"
    body = @"
## Problem
Starter uses ``#`` headers; renderer ignores Markdown; export says ``.md``.

## Acceptance criteria
- [ ] Spec in docs: supported syntax, math delimiters, prose rules
- [ ] Starter content, renderer, export aligned
- [ ] Migration note for existing rooms

## Estimate
**Size:** M | **Priority:** P0
"@
  }
  @{
    title = "Add standard (non-Vim) editing mode"
    milestone = "M1 — Core editing and activation"
    labels = "type:feature,priority:P0,area:editor,size:M"
    body = @"
## Problem
Vim-only default blocks general-audience invitees.

## Acceptance criteria
- [ ] Toggle or first-run choice: Vim vs Standard
- [ ] Preference persisted
- [ ] Standard mode: familiar keys, no modal gate

## Estimate
**Size:** M | **Priority:** P0
"@
  }
  @{
    title = "First-run onboarding and Vim cheatsheet"
    milestone = "M1 — Core editing and activation"
    labels = "type:feature,priority:P0,area:ui,size:S"
    body = @"
## Acceptance criteria
- [ ] 30-second product intro (edit, preview, share, @ai)
- [ ] Vim cheatsheet accessible from status bar or ``?``
- [ ] Starter note updated or interstitial added

## Estimate
**Size:** S | **Priority:** P0
"@
  }
  @{
    title = "Session templates and recent rooms"
    milestone = "M1 — Core editing and activation"
    labels = "type:feature,priority:P1,area:persistence,size:S"
    body = @"
## Acceptance criteria
- [ ] Template menu: Blank, Homework, Derivation, Quick integrals
- [ ] Recent rooms in localStorage with derived titles
- [ ] Does not contradict chosen ephemeral/TTL policy

## Estimate
**Size:** S | **Priority:** P1
"@
  }
  @{
    title = "Command palette for workspace actions"
    milestone = "M1 — Core editing and activation"
    labels = "type:feature,priority:P1,area:ui,size:M"
    body = @"
## Acceptance criteria
- [ ] ``Ctrl/Cmd+K`` or ``/`` opens palette
- [ ] Actions: share, export, toggle view, @ai, switch shell, new room
- [ ] Keyboard navigable

## Estimate
**Size:** M | **Priority:** P1
"@
  }
  @{
    title = "Share and export UX polish"
    milestone = "M1 — Core editing and activation"
    labels = "type:feature,priority:P1,area:ui,area:import-export,size:S"
    body = @"
## Acceptance criteria
- [ ] Copy-link toast + fallback selectable URL
- [ ] Invite copy explains live collab expectations
- [ ] Copy-as-TeX and copy-as-Markdown buttons

## Estimate
**Size:** S | **Priority:** P1
"@
  }
  @{
    title = "Epic: M2 — Collaboration and persistence"
    milestone = "M2 — Collaboration and persistence"
    labels = "type:epic,priority:P0,area:collaboration,size:L"
    body = @"
## Scope
Trustworthy sessions, presence, permissions, reconnect, snapshots.

## Estimate
**Size:** L | **Priority:** P0
"@
  }
  @{
    title = "RFC: Production collaboration and persistence architecture"
    milestone = "M2 — Collaboration and persistence"
    labels = "type:research,priority:P0,area:platform,area:collaboration,size:M"
    body = @"
## Options to evaluate
- Self-hosted Yjs + optional LevelDB/Postgres snapshots
- Hocuspocus / managed collab service
- Redis pub/sub for multi-instance

## Acceptance criteria
- [ ] Decision doc with cost, ops burden, migration path
- [ ] Explicit rejection of local LevelDB as sole SaaS strategy

## Estimate
**Size:** M | **Priority:** P0
"@
  }
  @{
    title = "Reconnect UX and offline editing banner"
    milestone = "M2 — Collaboration and persistence"
    labels = "type:feature,priority:P0,area:collaboration,size:S"
    body = @"
## Acceptance criteria
- [ ] Disconnected state shows reconnect CTA
- [ ] Local edits queue or clear messaging when offline
- [ ] Successful reconnect resyncs without data loss

## Estimate
**Size:** S | **Priority:** P0
"@
  }
  @{
    title = "Enhanced presence: peer list, selections, typing indicator"
    milestone = "M2 — Collaboration and persistence"
    labels = "type:feature,priority:P1,area:collaboration,size:M"
    body = @"
## Acceptance criteria
- [ ] Named peer chips in status or sidebar
- [ ] Remote selections visible (not just carets)
- [ ] Typing indicator in chat and/or editor

## Estimate
**Size:** M | **Priority:** P1
"@
  }
  @{
    title = "Permission-aware share links (read-only)"
    milestone = "M2 — Collaboration and persistence"
    labels = "type:feature,priority:P1,area:collaboration,area:security,size:M"
    body = @"
## Acceptance criteria
- [ ] Generate view-only vs edit links
- [ ] Server enforces role on WS join
- [ ] UI shows current permission mode

## Dependencies
Blocked by: persistence RFC (for token storage approach)

## Estimate
**Size:** M | **Priority:** P1
"@
  }
  @{
    title = "Room TTL, expiry, and optional password"
    milestone = "M2 — Collaboration and persistence"
    labels = "type:feature,priority:P1,area:persistence,area:security,size:M"
    body = @"
## Acceptance criteria
- [ ] Configurable room lifetime (e.g. 24h default)
- [ ] Optional PIN/password on join
- [ ] Owner can extend or destroy room

## Estimate
**Size:** M | **Priority:** P1
"@
  }
  @{
    title = "Snapshots and version history"
    milestone = "M2 — Collaboration and persistence"
    labels = "type:feature,priority:P2,area:persistence,size:L"
    body = @"
## Acceptance criteria
- [ ] Manual checkpoint + auto periodic snapshot
- [ ] List versions with timestamp and author
- [ ] Restore replaces buffer with confirm dialog

## Estimate
**Size:** L | **Priority:** P2
"@
  }
  @{
    title = "Epic: M3 — AI mathematical workflows"
    milestone = "M3 — AI mathematical workflows"
    labels = "type:epic,priority:P0,area:ai,size:L"
    body = @"
## Scope
Reviewable AI, scoped edits, streaming, provenance.

## Estimate
**Size:** L | **Priority:** P0
"@
  }
  @{
    title = "AI diff preview with accept/reject workflow"
    milestone = "M3 — AI mathematical workflows"
    labels = "type:feature,priority:P0,area:ai,size:L"
    body = @"
## Problem
AI replaces entire buffer via ``@@@DOCUMENT`` markers without review.

## Acceptance criteria
- [ ] Proposed patch shown as diff before apply
- [ ] Accept / Reject controls; Reject leaves doc unchanged
- [ ] All peers see accepted patch via Yjs
- [ ] @ai concurrency queue prevents overlapping applies

## Estimate
**Size:** L | **Priority:** P0
"@
  }
  @{
    title = "Selection-aware and inline AI actions"
    milestone = "M3 — AI mathematical workflows"
    labels = "type:feature,priority:P1,area:ai,size:M"
    body = @"
## Acceptance criteria
- [ ] Context menu or palette: Explain, Simplify, Fix TeX, Expand derivation
- [ ] Actions scoped to selection when present
- [ ] Same accept/reject flow as full-doc patches

## Dependencies
Blocked by: AI diff preview

## Estimate
**Size:** M | **Priority:** P1
"@
  }
  @{
    title = "AI streaming, cancel, and usage quotas"
    milestone = "M3 — AI mathematical workflows"
    labels = "type:feature,priority:P2,area:ai,area:security,size:M"
    body = @"
## Acceptance criteria
- [ ] Stream tokens to chat UI
- [ ] Cancel in-flight request
- [ ] Per-room or per-IP daily quota with clear UX

## Estimate
**Size:** M | **Priority:** P2
"@
  }
  @{
    title = "Epic: M4 — Import, export, and polish"
    milestone = "M4 — Import, export, and polish"
    labels = "type:epic,priority:P1,area:import-export,size:M"
    body = @"
## Scope
Formats, PDF, delight polish.

## Estimate
**Size:** M | **Priority:** P1
"@
  }
  @{
    title = "Import LaTeX and Markdown files"
    milestone = "M4 — Import, export, and polish"
    labels = "type:feature,priority:P1,area:import-export,size:M"
    body = @"
## Acceptance criteria
- [ ] File picker or drag-drop for ``.tex`` and ``.md``
- [ ] Validates size; replaces or appends with confirm
- [ ] Handles canonical format from M1

## Estimate
**Size:** M | **Priority:** P1
"@
  }
  @{
    title = "PDF export and equation image export"
    milestone = "M4 — Import, export, and polish"
    labels = "type:feature,priority:P2,area:import-export,size:L"
    body = @"
## Acceptance criteria
- [ ] Print-to-PDF or server-side KaTeX HTML → PDF
- [ ] Per-equation PNG/SVG/MathML copy
- [ ] Documented limitations vs full LaTeX

## Estimate
**Size:** L | **Priority:** P2
"@
  }
  @{
    title = "Delight polish: toasts, empty states, metadata"
    milestone = "M4 — Import, export, and polish"
    labels = "type:feature,priority:P1,area:ui,size:S"
    body = @"
## Acceptance criteria
- [ ] Toast system for share/copy/errors
- [ ] Empty/waiting states for peers and chat
- [ ] OG/Twitter metadata for shared links (from redesign)

## Estimate
**Size:** S | **Priority:** P1
"@
  }
  @{
    title = "Epic: M5 — Production and SaaS readiness"
    milestone = "M5 — Production and SaaS readiness"
    labels = "type:epic,priority:P2,area:business,size:XL"
    body = @"
## Scope
Auth, observability, analytics, scaling, billing — gated on retention proof.

## Gate
Do not start accounts/billing until north-star metric shows repeat collaborative use.

## Estimate
**Size:** XL | **Priority:** P2
"@
  }
  @{
    title = "Observability: structured logging and error tracking"
    milestone = "M5 — Production and SaaS readiness"
    labels = "type:feature,priority:P1,area:platform,size:M"
    body = @"
## Acceptance criteria
- [ ] Structured logs with request/room correlation
- [ ] Error tracking integration (e.g. Sentry)
- [ ] Health/readiness endpoints

## Estimate
**Size:** M | **Priority:** P1
"@
  }
  @{
    title = "Privacy-respecting product analytics"
    milestone = "M5 — Production and SaaS readiness"
    labels = "type:feature,priority:P1,area:product,size:M"
    body = @"
## Events (minimum)
room_created, peer_joined, export, ai_accept, ai_reject, return_visit

## Acceptance criteria
- [ ] No PII in document content
- [ ] Opt-out or minimal cookie footprint documented
- [ ] Dashboard or export for founder review

## Estimate
**Size:** M | **Priority:** P1
"@
  }
  @{
    title = "RFC: Optional accounts and saved workspaces"
    milestone = "M5 — Production and SaaS readiness"
    labels = "type:research,priority:P3,area:business,size:L"
    body = @"
## Gate
Requires demonstrated 7-day return rate for collaborative sessions.

## Acceptance criteria
- [ ] Data model for users, rooms, entitlements
- [ ] Magic link or OAuth options compared
- [ ] Migration from anonymous rooms

## Estimate
**Size:** L | **Priority:** P3
"@
  }
  @{
    title = "RFC: Billing, entitlements, and subscription tiers"
    milestone = "M5 — Production and SaaS readiness"
    labels = "type:research,priority:P3,area:business,size:M"
    body = @"
## Proposed tiers (draft)
- Free: public ephemeral rooms, rate-limited AI
- Pro: private rooms, longer TTL, better models
- Team: org admin, shared library

## Non-goals
Implement Stripe in this issue.

## Estimate
**Size:** M | **Priority:** P3
"@
  }
) | ConvertTo-Json -Depth 5 | Out-File -Encoding utf8 scripts/issue-backlog.json
