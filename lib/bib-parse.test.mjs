import assert from "node:assert/strict";
import test from "node:test";
import {
  filterBibEntries,
  parseBibEntriesFromNote,
  parseBibitemEntries,
  parseBibtexEntries,
  scoreBibEntry,
} from "./bib-parse.ts";

test("parseBibtexEntries reads @article key title author", () => {
  const src = `
@article{knuth84,
  author = {Donald Knuth},
  title = {Literate Programming},
  year = {1984}
}
@book{lamport94,
  title = "LaTeX: A Document Preparation System",
  author = "Leslie Lamport"
}
`;
  const entries = parseBibtexEntries(src);
  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.find((e) => e.key === "knuth84"),
    {
      key: "knuth84",
      kind: "article",
      title: "Literate Programming",
      author: "Donald Knuth",
    },
  );
  assert.equal(
    entries.find((e) => e.key === "lamport94")?.author,
    "Leslie Lamport",
  );
});

test("parseBibtexEntries skips @string / @comment", () => {
  const src = `
@string{foo = "bar"}
@comment{ignore}
@misc{keepme,
  title = {Keep}
}
`;
  const entries = parseBibtexEntries(src);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].key, "keepme");
});

test("parseBibitemEntries reads keys and nearby text", () => {
  const src = `
\\begin{thebibliography}{9}
\\bibitem{einstein} Albert Einstein, Relativity.
\\bibitem[Knuth(1984)]{knuth84} Literate Programming.
\\end{thebibliography}
`;
  const entries = parseBibitemEntries(src);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].key, "einstein");
  assert.ok(entries[0].title?.includes("Einstein"));
  assert.equal(entries[1].key, "knuth84");
});

test("parseBibEntriesFromNote merges bibitem and BibTeX; BibTeX wins on key", () => {
  const src = `
\\bibitem{shared} Old title
@article{shared,
  title = {New Title},
  author = {Ada}
}
@article{onlybib, title = {Only Bib}}
`;
  const entries = parseBibEntriesFromNote(src);
  const keys = entries.map((e) => e.key).sort();
  assert.deepEqual(keys, ["onlybib", "shared"]);
  const shared = entries.find((e) => e.key === "shared");
  assert.equal(shared?.title, "New Title");
  assert.equal(shared?.author, "Ada");
  assert.equal(shared?.kind, "article");
});

test("filterBibEntries fuzzy-matches key title author", () => {
  const entries = [
    { key: "knuth84", kind: "article", title: "Literate Programming", author: "Donald Knuth" },
    { key: "lamport94", kind: "book", title: "LaTeX System", author: "Leslie Lamport" },
  ];
  assert.deepEqual(
    filterBibEntries(entries, "knu").map((e) => e.key),
    ["knuth84"],
  );
  assert.ok(filterBibEntries(entries, "literate").some((e) => e.key === "knuth84"));
  assert.ok(filterBibEntries(entries, "leslie").some((e) => e.key === "lamport94"));
  assert.equal(filterBibEntries(entries, "zzz").length, 0);
});

test("scoreBibEntry ranks exact key highest", () => {
  const e = { key: "abc", kind: "misc", title: "About XYZ" };
  assert.ok(scoreBibEntry(e, "abc") > scoreBibEntry(e, "ab"));
  assert.ok(scoreBibEntry(e, "ab") > scoreBibEntry(e, "xyz"));
  assert.equal(scoreBibEntry(e, "nope"), 0);
});
