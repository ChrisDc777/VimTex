/**
 * Studio-only `\cite{…}` autocomplete from note-local bib/bibitem (#61 Level A).
 */

import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import {
  filterBibEntries,
  parseBibEntriesFromNote,
  type BibEntry,
} from "@/lib/bib-parse";

/** Match `\cite{…` up to the cursor; capture brace contents (may include commas). */
const CITE_BEFORE_RE = /\\cite\{([^}]*)$/;

const EMPTY_HINT: Completion = {
  label: "No citations in this note",
  detail: "Add \\bibitem{key} or paste BibTeX (@article{…})",
  type: "text",
  boost: -99,
  apply: () => {
    /* leave the typed \\cite{ fragment unchanged */
  },
};

function entryDetail(entry: BibEntry): string {
  const bits = [entry.author, entry.title].filter(Boolean);
  if (bits.length) return bits.join(" — ");
  return entry.kind === "bibitem" ? "bibitem" : `@${entry.kind}`;
}

function toCompletion(entry: BibEntry, query: string): Completion {
  const q = query.trim().toLowerCase();
  const key = entry.key.toLowerCase();
  let boost = 0;
  if (key === q) boost = 20;
  else if (key.startsWith(q)) boost = 10;
  else if (key.includes(q)) boost = 5;

  return {
    label: entry.key,
    detail: entryDetail(entry),
    type: "keyword",
    boost,
    apply: entry.key,
  };
}

/**
 * Completion source for `\cite{` / `\cite{partial` / `\cite{a,partial`.
 * Reads keys from the current document only (offline-first).
 */
export function citeCompletionSource(
  context: CompletionContext,
): CompletionResult | null {
  const before = context.matchBefore(CITE_BEFORE_RE);
  if (!before) return null;

  const braceContent = before.text.slice(before.text.indexOf("{") + 1);
  const comma = braceContent.lastIndexOf(",");
  const query = comma >= 0 ? braceContent.slice(comma + 1) : braceContent;
  const from =
    before.from +
    before.text.length -
    query.length;

  const doc = context.state.doc.toString();
  const entries = parseBibEntriesFromNote(doc);

  if (entries.length === 0) {
    return {
      from,
      options: [EMPTY_HINT],
      filter: false,
      validFor: /^[^},]*$/,
    };
  }

  const matched = filterBibEntries(entries, query);
  if (!matched.length) return null;

  return {
    from,
    options: matched.slice(0, 50).map((e) => toCompletion(e, query)),
    filter: false,
    validFor: /^[^},]*$/,
  };
}
