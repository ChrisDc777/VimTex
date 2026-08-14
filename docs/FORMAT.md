# VimTex Document Format (v1)

> Canonical format for the note buffer. Spec for issue #13 — "Define canonical
> Markdown+TeX document format". Implemented by `lib/render-note.ts`, seeded by
> `lib/starter-content.ts` / `lib/templates.ts`, exported by `lib/export.ts`.

## 1. Model

A VimTex note is a single **UTF-8 plain-text buffer** with `LF` line endings. It
is the single source of truth: the preview is a *projection* of it. **Copy
VimTex source** is the lossless path (clipboard, buffer verbatim). File exports
are *handoff* conversions for other apps — they are not a second source of
truth. The buffer is stored as a Yjs `Y.Text` shared string and edited
collaboratively.

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
  source, Copy, and file exports**. To write a literal `%`, escape it as `\%`.
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
  editing (Realtime / Live mode), and empty instructional delimiters (`\( \)`, `\[ \]`)
  are left as literal text so they don't confuse beginners.
- **Live / Realtime widgets:** single-line math is always eligible; multi-line
  `\[ ... \]` uses a block widget. Multi-line `\(...\)` is not widget-replaced
  (use Split preview, or keep display math on one line / with `\[ \]`).
  Studio Live is required for editor widgets; Split shows KaTeX in the preview pane.

## 5. Exports and imports

Authoring in the live buffer stays VimTex (`\( \)` / `\[ \]`). File import/export
rewrites delimiters for other apps. **Copy VimTex source** is the lossless path.

| Action | What you get |
|--------|----------------|
| **Copy VimTex source** | Clipboard = live buffer, unchanged |
| **Export as LaTeX** | Overleaf-ready `.tex`: `\documentclass{article}` + `fontenc` + `amsmath,amssymb` + `\begin{document}…\end{document}`. Skips the wrapper if `\begin{document}` is already present. Delimiters stay `\( \)` / `\[ \]`. Bare math is wrapped. `#` headings become `\section*` / `\subsection*`. |
| **Export as Markdown** | `.md` with `$` / `$$` instead of `\( \)` / `\[ \]` (Obsidian, GitHub, Jupyter). Bare math is **not** wrapped. |
| **Export as PDF** | Browser print of the **rendered** note (Save as PDF). Light paper; KaTeX as in preview. Not a LaTeX compiler. |
| **Copy equation TeX / SVG / PNG** | Preview hover bar sits on the equation: TeX source, SVG, or PNG (black on white, KaTeX fonts embedded). |
| **Import `.tex` / `.md`** | UTF-8, strip BOM, CRLF → LF. Full LaTeX files import **only the document body**. `$` / `$$` math is converted to `\( \)` / `\[ \]` (toast: `converted $ math`). Escaped `\$` is left alone. |

The imported text replaces the current room buffer and syncs to peers.

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
| `$` / `$$` | literal in the live buffer; converted on import / `.md` export | `render-note.ts`, `lib/math-delimiters.ts` |
| `%` comments | stripped in preview, kept in source / Copy / file export | `render-note.ts` |
| Title | `\title{...}` then first line | `lib/document-title.ts` |
| Copy | lossless buffer | `lib/copy-note.ts` |
| `.tex` export | article wrapper; wrap bare math; `#` → `\section*` | `lib/export.ts` |
| `.md` export | `\( \)` / `\[ \]` → `$` / `$$` | `lib/export.ts` |
| PDF export | print rendered preview | `lib/export.ts` |
| Equation image | SVG / PNG from preview KaTeX | `lib/equation-image.ts` |
| Imports | UTF-8, LF, unwrap `\begin{document}`, `$` → `\( \)` | `lib/import-note.ts` |
