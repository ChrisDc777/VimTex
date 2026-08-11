# VimTex — AI roadmap (Studio vs Forge)

**Status:** Waves A–D Level A landed; #57 Level C shipped; #60 room prefs shipped  
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
| Equation-scoped rewrite | ✅ Lvl A | ❌ | #83 |
| Derivation coach | ✅ Lvl A | ✅ | #84 |
| Ghost text | 🔄 | ❌ | #55 |
| Streaming + cancel | ✅ | ✅ | #29 |
| Diagnostics explain | ✅ | ✅ | #53 |
| Chat memory (last N) | ✅ | ❌ | #54 |
| Slash commands | ✅ | ❌ | #63 |
| Doc actions | 🔄 | ❌ | #58 |
| Templates (/letter…) | 🔄 | ❌ | #52 |
| Outline + TODO scan | 🔄 | ❌ | #56 |
| Grammar / critique review | ✅ Lvl A | ❌ | #62 |

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

#57 context (A+B+C) → #28 selection actions → #53 diagnostics → #54 memory

**#57 Level A+B+C:** caret pack + Studio selection context + Sel chip + math unwrap; Level C adds Studio-only live diagnostics, TeX outline, and note-local citation keys into the system prompt (Forge stays file-only).  
**#28:** Studio selection bar (Explain / Simplify / Fix TeX) — editor-anchored, not more chat chrome.  
**#53:** Studio diagnostics strip with Explain / Fix → chat + surrounding lines. Forge Problem panel stays list-only.  
**#54 Level A:** Studio sends last N @vimothy turns with each request (trimmed); route stays stateless. Forge stays single-shot.

### Wave C — Studio depth

#63 slash (chat composer) ✅ → #55 ghost (local TeX) ✅ → #58 doc actions + #52 templates → chrome prefs / compose-then-send → #56 outline ✅ → editor `/` inserts → #61 cite ✅ → #62 review ✅ Level A → #60 polish (usage + raised limits)

**#63:** Studio chat `/` menu — pick command → chip + optional context → Enter runs.  
**#55 Level A:** local ghost text for `\begin{…}` / math closers in Studio insert mode (Tab accept, Esc dismiss). AI type-ahead later.  
**#58 / #52:** Chat doc-action pills (fix errors, abstract, …) + `/letter` `/paper` `/cv` `/notes` scaffolds via diff.  
**Chrome prefs:** Preferences AI section toggles for slash menu / doc pills / ghost (defaults: slash+ghost on, pills off).  
**#56:** Studio left outline panel — heuristic `\part`/`\section`/`\subsection` tree + `\todo{}` / `% TODO` badges with jump-to-line (AI fallback deferred).  
**Editor `/` inserts:** Insert-mode only — `/section` `/todo` `/math` `/list` /… via CM autocomplete (Vim normal `/` search untouched).  
**#61 Level A:** Studio `\cite{` completion from note-local BibTeX / `\bibitem` (offline fuzzy match; no separate `.bib` file yet).  
**#62 Level A:** Studio `/review` slash (+ optional Review doc-action pill) asks Vimothy for a whole-note grammar/style pass (skip math/verbatim), proposing via existing Confirm/diff (`@@@PATCH` preferred). Chunked multi-suggestion panel deferred.

### Wave D / triage

| Idea | Action |
|------|--------|
| Ranged patch format (#87) | ✅ Level A shipped |
| CM line/gutter diff (#88) | ✅ Level A — gutter ± + line tint on pending before-lines |
| Snapshot on Accept (#89) | ✅ Optional pref (default off); labeled `Pre-AI: …` via #25 |
| Equation-scoped rewrite (#83) | ✅ Level A — caret/selection in math → Equation bar + Rewrite eq |
| Derivation coach (#84) | ✅ Level A — `/derive` (+ Coach action); `mode=coach` forbids patches; Forge `/derive` only |
| AI profiles / per-room instructions | M5 / late M3 |
| Project retrieval / RAG (#57 Level D) | M5+ — explicitly optional; overkill for v1 (single-note rooms) |
| Section summaries | Skip / P3 |
| Peer-aware apply | M3 late |

**#87 Level A (shipped path):** Model prefers ranged patches; chat parses `@@@PATCH`, applies unique FIND→THEN hunks against the pre-request buffer, and proposes via `AiReviewStore` with `kind: "patch"`. Accept/Reject remains whole-proposal (full `after`). Per-hunk Accept UI deferred.  

**#88 Level A:** While a proposal is pending, Studio CM shows a gutter mark and line tint on changed lines in the live (`before`) buffer (from `diffLines`). Cleared on Accept/Reject.

**#89:** Optional Preferences → AI → Snapshot on Accept (default off). Confirm Accept may create a labeled #25 checkpoint (`Pre-AI: source · time`) from the client pre-apply buffer (does not mutate live Yjs). Auto-apply skips this; restore is manual and room-wide via Version history (client Y.Doc apply).

**#83 Level A:** When the caret or selection sits in a parsed math span (`\(`/`\[` / auto-math), Studio shows an Equation action bar. **Rewrite eq** expands to that span and asks Vimothy for a patch-only equation rewrite (Confirm Accept). Forge stays suggest-only.

**#84 Level A:** `/derive` (Studio full slash menu + Forge derive-only) and Studio **Coach** selection action run chat-only coaching. API `mode=coach` swaps the system prompt to forbid `@@@PATCH`/`@@@DOCUMENT`; the client ignores any accidental edit markers. Works in view-only rooms (chat still runs). Homework-no-answer mode deferred.

## Later milestone ideas (M5+)

The items below were brainstormed during the Wave B/C sprint and are explicitly **not** in M3/M4. File issues or add to M5 when the time comes.

### Cursor-style Ask / Plan chips
Composer "mode chips" (Ask / Plan / Edit) above the input — analogous to Cursor's agent-mode picker.
- **Ask** = current chat default (no mutations).
- **Plan** = structured breakdown turn before any patch; model outlines steps first.
- **Edit** = full doc or ranged apply; confirms via `AiReviewStore`.
Mode would be persisted per-room alongside model/temperature in `ai-room-prefs.ts`.

### Slash-command preferences (action bar toggles)
- Let users toggle individual selection-action-bar entries on/off in Preferences → AI.
- Allow adding custom slash commands (id + instruction template) — stored in `ai-room-prefs.ts`.
- Chip color style picker: "Studio accent" (current breeze/sunset alternating) vs "Muted" (plain border).
Implementation note: `SLASH_COMMANDS` registry is in `lib/slash-commands.ts`; custom entries would need a separate `customSlashCommands` pref key.

### Provider logos in the Studio model picker
Show the provider logo (or abbreviated wordmark) alongside the model name in `ChatModelPicker`.
- Candidates: OpenRouter, OpenCode, Anthropic, OpenAI.
- Consider bundling a small `lib/provider-logos.ts` map of `providerId → SVG string | React component`.
- Logo style: 16 × 16 monochrome, inheriting `currentColor`.
- Font: OpenCode uses a distinctive font; optionally replicate it via a webfont subset for that entry.
- Additional provider types to support when added: Mistral, Cohere, Together, any HuggingFace-hosted endpoint via OpenRouter.

### Project retrieval / RAG (#57 Level D)
Already noted — explicitly optional, overkill for single-note v1 rooms.
Revisit when multi-document projects or workspaces land (M5+).

## Out of scope

- Accounts (#78/#37), multi-node Yjs, full LaTeX projects
- VS Code-parity inline diff before patch format

## Success metrics

- No “AI wiped my note” without Undo/Reject
- Forge never mutates via AI
- Studio mutating paths use Confirm or Auto+Undo
