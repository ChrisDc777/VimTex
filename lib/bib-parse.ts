/**
 * Offline-first citation extraction for Level A (#61).
 *
 * Rooms store a single Y.Text note — no separate .bib blob yet — so entries
 * come from the note itself: BibTeX `@type{key,` blocks and `\bibitem{key}`.
 */

export type BibEntry = {
  key: string;
  /** BibTeX entry type (`article`, …) or `bibitem`. */
  kind: string;
  title?: string;
  author?: string;
};

const BIBTEX_ENTRY_RE = /@([a-zA-Z]+)\s*\{\s*([^,\s}]+)\s*,/g;
const BIBITEM_RE = /\\bibitem(?:\s*\[[^\]]*\])?\s*\{([^}]+)\}/g;
const FIELD_RE =
  /\b(title|author)\s*=\s*(?:\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|"([^"]*)")/gi;

function extractFields(
  body: string,
): { title?: string; author?: string } {
  const out: { title?: string; author?: string } = {};
  FIELD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FIELD_RE.exec(body)) !== null) {
    const name = (m[1] ?? "").toLowerCase();
    const value = (m[2] ?? m[3] ?? "").replace(/\s+/g, " ").trim();
    if (!value) continue;
    if (name === "title" && !out.title) out.title = value;
    if (name === "author" && !out.author) out.author = value;
  }
  return out;
}

function nextEntryStart(doc: string, from: number): number {
  const slice = doc.slice(from);
  const at = slice.search(/@[a-zA-Z]+\s*\{/);
  return at < 0 ? doc.length : from + at;
}

/** Parse BibTeX `@article{key, …}` (and siblings) from a string. */
export function parseBibtexEntries(source: string): BibEntry[] {
  const entries: BibEntry[] = [];
  BIBTEX_ENTRY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BIBTEX_ENTRY_RE.exec(source)) !== null) {
    const kind = (m[1] ?? "").toLowerCase();
    const key = (m[2] ?? "").trim();
    if (!key || kind === "string" || kind === "preamble" || kind === "comment") {
      continue;
    }
    const bodyStart = m.index + m[0].length;
    const bodyEnd = nextEntryStart(source, bodyStart);
    const fields = extractFields(source.slice(bodyStart, bodyEnd));
    entries.push({ key, kind, ...fields });
  }
  return entries;
}

/** Parse `\bibitem{key}` (optional optional-arg) from a string. */
export function parseBibitemEntries(source: string): BibEntry[] {
  const entries: BibEntry[] = [];
  BIBITEM_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BIBITEM_RE.exec(source)) !== null) {
    const key = (m[1] ?? "").trim();
    if (!key) continue;
    const after = source.slice(m.index + m[0].length);
    const stop = after.search(/\\bibitem|\\end\{thebibliography\}/);
    const snippet = (stop < 0 ? after : after.slice(0, stop))
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    entries.push({
      key,
      kind: "bibitem",
      ...(snippet ? { title: snippet } : {}),
    });
  }
  return entries;
}

/**
 * Collect citation keys from a note: BibTeX blocks and `\bibitem`s.
 * Later entries with the same key win (BibTeX usually overrides).
 */
export function parseBibEntriesFromNote(source: string): BibEntry[] {
  const byKey = new Map<string, BibEntry>();
  for (const e of parseBibitemEntries(source)) {
    byKey.set(e.key, e);
  }
  for (const e of parseBibtexEntries(source)) {
    byKey.set(e.key, e);
  }
  return [...byKey.values()];
}

function subsequenceMatch(hay: string, needle: string): boolean {
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) {
      i += 1;
      if (i >= needle.length) return true;
    }
  }
  return false;
}

/** Fuzzy score for a query against key / title / author. Higher is better; 0 = no match. */
export function scoreBibEntry(entry: BibEntry, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;

  const key = entry.key.toLowerCase();
  if (key === q) return 100;
  if (key.startsWith(q)) return 80;
  if (key.includes(q)) return 60;

  const title = (entry.title ?? "").toLowerCase();
  const author = (entry.author ?? "").toLowerCase();
  if (title.includes(q) || author.includes(q)) return 40;
  if (
    subsequenceMatch(key, q) ||
    subsequenceMatch(title, q) ||
    subsequenceMatch(author, q)
  ) {
    return 20;
  }
  return 0;
}

/** Filter and rank entries for completion. Empty query returns all (stable order). */
export function filterBibEntries(
  entries: readonly BibEntry[],
  query: string,
): BibEntry[] {
  const q = query.trim();
  if (!q) return [...entries];
  return entries
    .map((entry) => ({ entry, score: scoreBibEntry(entry, q) }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.entry.key.localeCompare(b.entry.key, undefined, {
          sensitivity: "base",
        }),
    )
    .map((x) => x.entry);
}
