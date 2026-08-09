/**
 * Insert-mode `/` TeX scaffolds via CodeMirror autocomplete source.
 * Wired into latexCompletionExtension override (does not bind Vim normal `/`).
 */

import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { EditorView } from "@codemirror/view";
import { getCM } from "@replit/codemirror-vim";
import {
  filterEditorSlashInserts,
  type EditorSlashInsert,
} from "@/lib/editor-slash-inserts";
import {
  SNIPPET_CURSOR,
  SNIPPET_SEL_CLOSE,
  SNIPPET_SEL_OPEN,
} from "@/lib/snippets";

function isEditorInsertMode(view: EditorView): boolean {
  const cm = getCM(view);
  if (!cm) return true;
  const vim = (
    cm.state as { vim?: { insertMode?: boolean; mode?: string } } | undefined
  )?.vim;
  if (!vim) return true;
  if (vim.insertMode) return true;
  const mode = (vim.mode ?? "").toLowerCase();
  return mode === "insert" || mode === "replace";
}

function applySnippetTemplate(
  view: EditorView,
  from: number,
  to: number,
  template: string,
): void {
  const markerPattern = /[\uE000\uE001\uE002]/g;
  const stripped = template.replace(markerPattern, "");
  const idxBefore = (n: number) =>
    template.slice(0, n).replace(markerPattern, "").length;

  const cursorIdx = template.indexOf(SNIPPET_CURSOR);
  const selOpenIdx = template.indexOf(SNIPPET_SEL_OPEN);
  const selCloseIdx = template.indexOf(SNIPPET_SEL_CLOSE);

  let anchor = from + stripped.length;
  let head: number | undefined;
  if (cursorIdx >= 0) {
    anchor = from + idxBefore(cursorIdx);
  } else if (selOpenIdx >= 0 && selCloseIdx > selOpenIdx) {
    anchor = from + idxBefore(selCloseIdx);
    head = from + idxBefore(selOpenIdx);
  }

  view.dispatch({
    changes: { from, to, insert: stripped },
    selection: { anchor, head },
    scrollIntoView: true,
  });
}

function toCompletion(item: EditorSlashInsert): Completion {
  return {
    label: `/${item.slash}`,
    detail: item.label,
    type: "keyword",
    boost: 10,
    apply: (view, _completion, from, to) => {
      applySnippetTemplate(view, from, to, item.snippet);
    },
  };
}

export function editorSlashCompletionSource(
  context: CompletionContext,
): CompletionResult | null {
  const view = context.view;
  if (!view || !isEditorInsertMode(view)) return null;

  const match = context.matchBefore(/(^|[\s])\/[a-zA-Z]*/);
  if (!match) return null;

  const slashAt = match.text.indexOf("/");
  if (slashAt < 0) return null;
  const from = match.from + slashAt;
  const query = match.text.slice(slashAt + 1);

  const options = filterEditorSlashInserts(query).map(toCompletion);
  if (!options.length) return null;

  return {
    from,
    options,
    validFor: /^\/[a-zA-Z]*$/,
  };
}
