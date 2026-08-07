# VimTex — AI roadmap (Studio vs Forge)

**Status:** Wave A landed (gate + diff + stream); review UX store + prefs  
**Epics:** [#26](https://github.com/ChrisDc777/VimTex/issues/26) (M3 milestone), [#64](https://github.com/ChrisDc777/VimTex/issues/64) (Studio AI tracking root)  
**Related:** Forge gate [#59](https://github.com/ChrisDc777/VimTex/issues/59), diff [#27](https://github.com/ChrisDc777/VimTex/issues/27), stream [#29](https://github.com/ChrisDc777/VimTex/issues/29)

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

**Deferred:** VS Code-style CM6 inline diff until **ranged patches** replace full-buffer `@@@DOCUMENT`.

## Shell matrix

| Feature | Studio | Forge | Issue |
|---------|:------:|:-----:|-------|
| Room chat + @vimothy Q&A | ✅ | ✅ | today |
| Chat → document edit (via diff) | ✅ | ❌ | #27 + gate |
| Diff accept / reject | ✅ | ❌ | #27 |
| Auto-apply + Undo | ✅ | ❌ | review prefs |
| Preview Before/After | ✅ | — | showInPreview |
| Selection / inline actions | 🔄 | ❌ | #28 |
| Ghost text | 🔄 | ❌ | #55 |
| Streaming + cancel | ✅ | ✅ | #29 |
| Diagnostics explain | 🔄 | ✅ | #53 |
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
Levels C–D (diagnostics / RAG) still deferred.

### Wave C — Studio depth

#63 slash, #55 ghost, #58 doc actions, #52 templates, #56 outline, #62 review, #61 cite, #60 polish

### Wave D / triage

| Idea | Action |
|------|--------|
| Ranged patch format | **P1** — unlocks multi-hunk + CM marks |
| CM line/gutter diff | P2 after patches |
| Snapshot on Accept (#25) | P2 optional |
| AI profiles / per-room instructions | M5 / late M3 |
| Section summaries | Skip / P3 |
| Peer-aware apply | M3 late |
| Derivation coach / equation-scoped | M3 (#83/#84) |

## Out of scope

- Accounts (#78/#37), multi-node Yjs, full LaTeX projects
- VS Code-parity inline diff before patch format

## Success metrics

- No “AI wiped my note” without Undo/Reject
- Forge never mutates via AI
- Studio mutating paths use Confirm or Auto+Undo
