# VimTex — AI roadmap (Studio vs Forge)

**Status:** Waves A–C landed; Wave D Level A ranged patches (#87) in progress  
**Epics:** [#26](https://github.com/ChrisDc777/VimTex/issues/26) (M3 milestone), [#64](https://github.com/ChrisDc777/VimTex/issues/64) (Studio AI tracking root)  
**Related:** Forge gate [#59](https://github.com/ChrisDc777/VimTex/issues/59), diff [#27](https://github.com/ChrisDc777/VimTex/issues/27), stream [#29](https://github.com/ChrisDc777/VimTex/issues/29), patches [#87](https://github.com/ChrisDc777/VimTex/issues/87)

## Product stance

| Shell | Role | AI posture |
|-------|------|------------|
| **Studio** | Default collab surface — share, chat, Live/Split | **Full AI**: Confirm (default) or Auto+Undo |
| **Forge** | Focused multi-tab workbench | **Suggest-only**: chat + explain; **never** auto-mutate |

New AI features **default Studio-only** and must explicitly opt into Forge.

## Hard rules (all shells)

1. **No silent full-buffer replace** — apply only via **Confirm** (Accept/Reject) or **Auto with Undo**. Never apply with no recovery path.
2. **Edit capability required** to apply any mutation (`?edit=` / ACL). View-only may still *ask* Vimothy; replies stay in chat.
3. **One concurrent AI job** per room client — avoid stacked `@@@DOCUMENT` races.
4. **Capability gate** — `lib/ai-features.ts` is the source of truth for what each shell *may* expose.
5. **Review SoT** — `AiReviewStore` (client-local) owns `pendingEdit`; chat invokes, shells/preview subscribe. Do not fork pending state in `useRoomChat`.

## Review architecture

```text
AiReviewStore  ← propose / accept / reject / auto+undo
     ↑                ↓
useRoomChat      Studio Split preview (optional Before/After)
     ↓
ychat (shared prose + documentEdit blob; Accept stays local)
```

Prefs (`lib/ai-review-prefs.ts`): `applyMode` confirm|auto; `showInPreview` boolean. Chat is always the control surface; preview is optional when Split is on.

**Deferred:** VS Code-style CM6 inline/gutter diff (#88) until ranged patches
land and expose stable hunk ranges — see Wave D.

## Shell matrix

| Feature | Studio | Forge | Issue |
|---------|:------:|:-----:|-------|
| Room chat + @vimothy Q&A | ✅ | ✅ | today |
| Chat → document edit (via diff) | ✅ | ❌ | #27 + gate |
| Diff accept / reject | ✅ | ❌ | #27 |
| Auto-apply + Undo | ✅ | ❌ | review prefs |
| Preview Before/After | ✅ | — | showInPreview |
| Selection / inline actions | ✅ | ❌ | #28 |
| Ghost text | 🔄 | ❌ | #55 |
| Streaming + cancel | ✅ | ✅ | #29 |
| Diagnostics explain | ✅ | ✅ | #53 |
| Chat memory (last N) | ✅ | ❌ | #54 |
| Slash commands | ✅ | ❌ | #63 |
| Doc actions | 🔄 | ❌ | #58 |
| Templates (/letter…) | 🔄 | ❌ | #52 |
| Outline + TODO scan | 🔄 | ❌ | #56 |
| Grammar / critique review | 🔄 | ❌ | #62 |

## Delivery waves

### Wave A — Make AI safe ✅

| Order | Work |
|------:|------|
| 1 | #59 Feature gate |
| 2 | #27 Diff Accept/Reject |
| 3 | #29 Streaming + cancel |
| 4 | Concurrency guard |

### Review UX (post–Wave A)

- `AiReviewStore` + compact chat diff + Confirm/Auto prefs + optional preview Before/After

### Wave B — Scoped power

#57 context (A+B) → #28 selection actions → #53 diagnostics → #54 memory

**#57 Level A+B:** caret pack + Studio selection context + Sel chip + math unwrap for LLM backticks/fences.  
**#28:** Studio selection bar (Explain / Simplify / Fix TeX) — editor-anchored, not more chat chrome.  
**#53:** Studio diagnostics strip with Explain / Fix → chat + surrounding lines. Forge Problem panel stays list-only.  
**#54 Level A:** Studio sends last N @vimothy turns with each request (trimmed); route stays stateless. Forge stays single-shot.

### Wave C — Studio depth

#63 slash (chat composer) ✅ → #55 ghost (local TeX) ✅ → #58 doc actions + #52 templates → chrome prefs / compose-then-send → #56 outline ✅ → editor `/` inserts → #62 review, #61 cite, #60 polish

**#63:** Studio chat `/` menu — pick command → chip + optional context → Enter runs.  
**#55 Level A:** local ghost text for `\begin{…}` / math closers in Studio insert mode (Tab accept, Esc dismiss). AI type-ahead later.  
**#58 / #52:** Chat doc-action pills (fix errors, abstract, …) + `/letter` `/paper` `/cv` `/notes` scaffolds via diff.  
**Chrome prefs:** Preferences AI section toggles for slash menu / doc pills / ghost (defaults: slash+ghost on, pills off).  
**#56:** Studio left outline panel — heuristic `\part`/`\section`/`\subsection` tree + `\todo{}` / `% TODO` badges with jump-to-line (AI fallback deferred).  
**Editor `/` inserts:** Insert-mode only — `/section` `/todo` `/math` `/list` /… via CM autocomplete (Vim normal `/` search untouched).

### Wave D / triage

| Idea | Action |
|------|--------|
| Ranged patch format (#87) | ✅ Level A shipped |
| CM line/gutter diff (#88) | ✅ Level A — gutter ± + line tint on pending before-lines |
| Snapshot on Accept (#89) | ✅ Optional pref (default off); labeled `Before AI: …` via #25 |
| AI profiles / per-room instructions | M5 / late M3 |
| Section summaries | Skip / P3 |
| Peer-aware apply | M3 late |
| Derivation coach / equation-scoped | M3 (#83/#84) |

**#87 Level A (shipped path):** Model prefers ranged patches; chat parses `@@@PATCH`, applies unique FIND→THEN hunks against the pre-request buffer, and proposes via `AiReviewStore` with `kind: "patch"`. Accept/Reject remains whole-proposal (full `after`). Per-hunk Accept UI deferred.  

**#88 Level A:** While a proposal is pending, Studio CM shows a gutter mark and line tint on changed lines in the live (`before`) buffer (from `diffLines`). Cleared on Accept/Reject.

**#89:** Optional Preferences → AI → Snapshot on Accept (default off). Confirm Accept may create a labeled #25 checkpoint (`Before AI: source · time`) of the buffer before apply. Auto-apply skips this; restore is room-wide via Version history.

## Out of scope

- Accounts (#78/#37), multi-node Yjs, full LaTeX projects
- VS Code-parity inline diff before patch format

## Success metrics

- No “AI wiped my note” without Undo/Reject
- Forge never mutates via AI
- Studio mutating paths use Confirm or Auto+Undo
