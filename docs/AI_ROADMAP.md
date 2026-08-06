# VimTex — AI roadmap (Studio vs Forge)

**Status:** Wave A in progress (gate + diff + stream)  
**Epics:** [#26](https://github.com/ChrisDc777/VimTex/issues/26) (M3 milestone), [#64](https://github.com/ChrisDc777/VimTex/issues/64) (Studio AI tracking root)  
**Related:** Forge gate [#59](https://github.com/ChrisDc777/VimTex/issues/59), diff [#27](https://github.com/ChrisDc777/VimTex/issues/27), stream [#29](https://github.com/ChrisDc777/VimTex/issues/29)

## Product stance

| Shell | Role | AI posture |
|-------|------|------------|
| **Studio** | Default collab surface — share, chat, Live/Split | **Full AI**: mutating actions allowed, always via accept/reject once #27 lands |
| **Forge** | Focused multi-tab workbench | **Suggest-only**: chat + explain; **never** auto-mutate the document |

This matches Forge’s design philosophy (calm tools, tabs, problem panel) and Studio’s activation loop (invite → edit together → AI helps rewrite safely). New AI features **default Studio-only** and must explicitly opt into Forge.

## Hard rules (all shells)

1. **No silent full-buffer replace** after #27 — proposals go through a diff (or equivalent scoped patch) with Accept / Reject.
2. **Edit capability required** to apply any mutation (`?edit=` / ACL). View-only may still *ask* Vimothy; replies stay in chat.
3. **One concurrent AI job** per room client (queue or disable) — avoid stacked `@@@DOCUMENT` races.
4. **Single feature gate** — `lib/ai-features.ts` (to build in #59) is the source of truth for what each shell exposes.

### Proposed gate shape

```ts
type AiFeature =
  | "chat"                 // @vimothy in room chat
  | "chatDocumentEdit"     // parse @@@DOCUMENT and offer apply
  | "diffAcceptReject"     // #27 UI
  | "selectionActions"     // #28
  | "ghostText"            // #55
  | "slashCommands"        // #63
  | "diagnosticsFix"       // #53 (mutate)
  | "diagnosticsExplain"   // #53 (read-only explain)
  | "chatDocActions"       // #58
  | "templatesGen"         // #52
  | "outlineTodo"          // #56
  | "grammarReview"        // #62
  | "citeComplete";        // #61

// Studio: all true (as shipped)
// Forge: chat + diagnosticsExplain only (expand only with explicit product OK)
```

## Shell matrix

| Feature | Studio | Forge | Issue |
|---------|:------:|:-----:|-------|
| Room chat + @vimothy Q&A | ✅ | ✅ | today |
| Chat → document edit (via diff) | ✅ | ❌ | #27 + gate |
| Diff accept / reject | ✅ | ❌ | #27 |
| Selection / inline actions | ✅ | ❌ | #28 |
| Ghost text | ✅ | ❌ | #55 |
| Slash commands (mutating) | ✅ | ❌ | #63 |
| Chat-driven doc actions | ✅ | ❌ | #58 |
| Diagnostics **fix** | ✅ | ❌ | #53 |
| Diagnostics **explain** (chat only) | ✅ | ✅ | #53 |
| Outline / TODO panel | ✅ | ⚪ optional later | #56 |
| Grammar / style review + diff | ✅ | ❌ | #62 |
| `\cite{` completion | ✅ | ⚪ optional later | #61 |
| Template generation into buffer | ✅ | ❌ | #52 |
| Streaming + cancel | ✅ | ✅ (chat stream only) | #29 |
| Multi-turn memory | ✅ | ✅ (chat only) | #54 |
| Rich chat context (file→project) | ✅ | ✅ levels A–B only | #57 |

⚪ = nice-to-have; not required for M3 exit.

## Delivery waves

### Wave A — Make AI safe (M3 exit)

**Exit:** No silent overwrite; user can reject patches; Forge cannot mutate.

| Order | Work | Why |
|------:|------|-----|
| 1 | **#59** Feature gate + stop Forge `applyAiEdit` | Prevents Forge mutations *before* more surfaces land |
| 2 | **#27** Diff preview + Accept/Reject | Replaces full-buffer apply; foundation for everything mutating |
| 3 | **#29** Streaming + cancel (+ basic usage) | UX for long TeX jobs; cancel stops bad applies |
| 4 | Concurrency guard (under #26 / #29) | One in-flight AI edit per client |

Optional small precursor: change prompts so models emit **unified diffs or ranged patches** instead of full documents once the apply path can consume them — keep `@@@DOCUMENT` as fallback during transition.

### Wave B — Scoped power (Studio)

| Order | Work | Notes |
|------:|------|-------|
| 5 | **#57** Context levels A–B (file + selection) | Selection context unlocks #28 |
| 6 | **#28** Selection-aware actions | Explain / simplify / fix TeX on range |
| 7 | **#53** Diagnostics explain + fix | Fix uses #27; explain OK on Forge |
| 8 | **#54** Multi-turn memory (start level A–B) | Don’t block Wave A |

### Wave C — Studio depth (can parallelize after A)

- **#63** Slash menu (Studio editor + composer)
- **#55** Ghost text (insert-mode, Studio-only; never Forge)
- **#58** Chat-driven actions (“fix all errors”, “add abstract”) → always via #27
- **#52** Template generation → insert via diff/checklist
- **#56** Outline + TODO scanner
- **#62** Whole-doc grammar/style review
- **#61** Citation completion (needs `.bib` story; may wait on M4 import)
- **#60** Polish: usage UI, stop/regenerate, per-project settings

### Wave D — Stretch / later milestones

| Idea | Why it fits VimTex | Suggest milestone |
|------|--------------------|-------------------|
| **Equation-scoped rewrite** (only `$…$` / `$$…$$` under cursor) | Safer than whole-doc; homework UX | M3 late / M4 |
| **Derivation coach** (step-by-step in chat, no buffer write) | Perfect **Forge** add-on | M3 |
| **Homework mode** (explain process, refuse final numeric answer) | Classroom without full M5 accounts | M4–M5 |
| **KaTeX preview error → suggested fix** | Ties preview + AI | M3 (#53 adjacent) |
| **Peer-aware apply** (warn if remote carets overlap patch) | Collab + AI | M3 late |
| **Snapshot-before-AI** (auto checkpoint on Accept) | Uses #25 APIs | M3 |
| **Image → LaTeX** (OCR) | Already roadmap P3 | M3 P3 / M4 |
| **Graphing spike** | Roadmap P3 | Deferred |
| **Voice dictation → TeX** | Accessibility | Deferred |
| **Multi-agent rooms** | Explicitly deferred in ROADMAP | Do not build |

## Dependency graph (simplified)

```text
#59 gate ─────────────────────────────────────────────┐
#27 diff ◄──── #28 selection ◄──── #55 ghost / #63 slash
   ▲                ▲
   └──── #53 fix ───┴──── #58 actions ──── #62 review
#29 stream ──► better UX for all of the above
#57 context ─► quality of #28 / #54
#54 memory  ─► multi-turn chat (non-blocking)
```

## Out of scope for AI tracks

- Accounts / claim guest room (#78, #37) — M5
- Production multi-node Yjs — M5 (RFC option B)
- Full LaTeX compiler / multi-file projects — deferred list

## Success metrics (lightweight)

- Zero production reports of “AI wiped my note” after #27
- Forge E2E: AI reply never changes `Y.Text` / editor doc
- Studio: Accept/Reject used on ≥ mutating AI paths (chat edit, selection fix, slash)

## Doc / issue hygiene

- M3 epic [#26](https://github.com/ChrisDc777/VimTex/issues/26) = milestone exit (diff + scoped + stream)
- Studio epic [#64](https://github.com/ChrisDc777/VimTex/issues/64) = detailed checklist; keep ordered by Wave A→C
- This file is the **product** source of truth for Studio vs Forge; update when the gate ships
