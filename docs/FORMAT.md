# VimTex Document Format (v1)

> Canonical format for the note buffer. Spec for issue #13 — "Define canonical
> Markdown+TeX document format". Implemented by `lib/render-note.ts`, seeded by
> `lib/starter-content.ts` / `lib/templates.ts`, exported by `lib/export.ts`.

## 1. Model

A VimTex note is a single **UTF-8 plain-text buffer** with `LF` line endings. It
is the single source of truth: the preview is a *projection* of it, and exports
are the buffer *verbatim*. It is stored as a Yjs `Y.Text` shared string and
edited collaboratively.

The format is deliberately a **lightweight Markdown-flavored prose + TeX math**
hybrid. The two non-negotiable rules:

1. Math is **KaTeX-friendly TeX written directly** — the `$` / `$$` delimiters
   from classic Markdown math are **not** used.
2. The buffer is plain text; anything that looks like markup a user did not
   intend is still displayed (never silently dropped from the source).

## 2. Document structure

- **Encoding / line endings:** UTF-8, `LF`. (CRLF input is normalized.)
- **Paragraphs:** blank lines separate paragraphs; a single newline is a soft
  line break.
- **`%` comments:** `%` starts a comment running to the end of its line.
  Comments are **stripped from the rendered preview** but **preserved in the
  source and in exports** (they are valid in both `.tex` and `.md`). To write a
  literal `%`, escape it as `\%`.
- **Title metadata:** an optional `\title{...}` on its own line declares the note
  title (first occurrence wins). It is read for tab labels and derived document
  titles; TeX markup inside the braces is stripped for display. When absent, the
  first non-empty line is used as a fallback title.
- **Headings:** ATX-style markers (`#`, `##`, …) are tolerated as literal text
  in the preview — they are structural hints for authors, not rendered elements.
  Rich Markdown rendering is a future extension.

## 3. Math

Math expressions are written directly in the buffer. KaTeX-compatible TeX is the
authoring subset; commands that KaTeX cannot render produce a non-destructive
inline error rather than failing the whole note.

### 3.1 Delimiters

| Form | Inline math | Display math |
|------|-------------|--------------|
| Explicit | `\( ... \)` | `\[ ... \]` |
| Bare (implicit) | see §3.2 | not promoted — use `\[ \]` |

`$ ... $` and `$$ ... $$` are **literal text** (not delimiters). The editor
highlights escaped specials (`\%`, `\#`, `\&`, `\$`) so stray `$` is visibly
literal.

### 3.2 Bare-math auto-detection

To keep prose readable, math can be written without delimiters. The renderer
promotes a span to math only when it clearly is math:

- **TeX commands:** any `\command{...}` (and a TeX suffix) inside prose, e.g.
  `\frac{1}{2}`, `\sqrt{x^{2} + 1}`.
- **Superscript/subscript expressions:** `x^2`, `2^5`, `a_{i}`.
- **Arithmetic / decimal expressions:** `2+3`, `3.14`, `x = 2`.

Plain prose numbers and single letters are **not** promoted (e.g. "chapter 42"
stays text). When a full line contains only bare math, it still renders inline —
use `\[ \]` to get display layout.

### 3.3 Escaping

Within prose, literal TeX specials must be escaped: `\%`, `\#`, `\&`, `\$`, `\_`,
`\{`, `\}`. Unescaped `%` is a comment (see §2). Escaped forms are preserved in
the source and render literally.

## 4. Rendering (preview)

- Text segments → paragraph `<p>` blocks; soft line breaks → `<br>`.
- Math segments → KaTeX; `display` math is a block, inline math is inline.
- `%` comments are stripped (not shown).
- Invalid math renders the raw source with an inline error style — the user can
  always see and fix the TeX.
- The caret never loses its mapping: math under the cursor shows raw source for
  editing (Realtime mode), and empty instructional delimiters (`\( \)`, `\[ \]`)
  are left as literal text so they don't confuse beginners.

## 5. Exports

`.tex` and `.md` exports write the **buffer verbatim** (delimiters, comments, and
markup preserved) — lossless by design. Both are *fragments*, not full documents:
no `\documentclass` wrapper is added or required.

## 6. Starter and templates

`lib/starter-content.ts` and `lib/templates.ts` seed new rooms. All seed content
must conform to this spec: plain-text prose, bare TeX and `\( \)`/`\[ \]`, no
`$`, optional `# ` headings as literal text, and `\title{...}` where a seeded
title is wanted. `lib/cm-latex-highlight.ts`, `lib/cm-latex-completion.ts`, and
the AI system prompt (`lib/ai-chat.ts`) share these conventions.

## 7. Alignment matrix

| Concern | Rule | Where |
|---------|------|-------|
| Source of truth | buffer verbatim | Yjs `Y.Text` |
| Inline math | `\( \)`, bare commands/expressions | `render-note.ts` |
| Display math | `\[ \]` only | `render-note.ts` |
| `$` / `$$` | literal text | `render-note.ts`, `cm-latex-highlight.ts` |
| `%` comments | stripped in preview, kept in source/export | `render-note.ts` |
| Title | `\title{...}` then first line | `lib/document-title.ts` |
| Exports | verbatim, no wrapper | `lib/export.ts` |
