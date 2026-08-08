/**
 * CodeMirror ghost-text decorations (#55).
 * Studio insert-mode / standard editor only; Tab accepts, Esc dismisses.
 */

import { completionStatus } from "@codemirror/autocomplete";
import {
  StateEffect,
  StateField,
  Prec,
  type Extension,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { getCM } from "@replit/codemirror-vim";
import { computeGhostSuggestion } from "@/lib/ghost-text";

const DEBOUNCE_MS = 500;

const setGhostEffect = StateEffect.define<string | null>();

const ghostField = StateField.define<string | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setGhostEffect)) return e.value;
    }
    if (tr.docChanged || tr.selection) return null;
    return value;
  },
});

class GhostWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  eq(other: GhostWidget): boolean {
    return this.text === other.text;
  }

  toDOM(): HTMLElement {
    const el = document.createElement("span");
    el.className = "cm-ghost-text";
    el.textContent = this.text;
    el.setAttribute("aria-hidden", "true");
    return el;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function buildGhostDecorations(view: EditorView): DecorationSet {
  const text = view.state.field(ghostField, false);
  if (!text) return Decoration.none;
  const sel = view.state.selection.main;
  if (!sel.empty) return Decoration.none;
  return Decoration.set([
    Decoration.widget({
      widget: new GhostWidget(text),
      side: 1,
    }).range(sel.head),
  ]);
}

function isEditorInsertMode(view: EditorView): boolean {
  const cm = getCM(view);
  if (!cm) return true; // standard (non-Vim) editor
  const vim = (
    cm.state as { vim?: { insertMode?: boolean; mode?: string } } | undefined
  )?.vim;
  if (!vim) return true;
  if (vim.insertMode) return true;
  const mode = (vim.mode ?? "").toLowerCase();
  return mode === "insert" || mode === "replace";
}

function clearGhost(view: EditorView): void {
  if (view.state.field(ghostField, false) == null) return;
  view.dispatch({ effects: setGhostEffect.of(null) });
}

function acceptGhost(view: EditorView): boolean {
  if (completionStatus(view.state) === "active") return false;
  const text = view.state.field(ghostField, false);
  if (!text) return false;
  const head = view.state.selection.main.head;
  if (!view.state.selection.main.empty) return false;
  view.dispatch({
    changes: { from: head, insert: text },
    selection: { anchor: head + text.length },
    effects: setGhostEffect.of(null),
    scrollIntoView: true,
  });
  return true;
}

function dismissGhost(view: EditorView): boolean {
  if (view.state.field(ghostField, false) == null) return false;
  clearGhost(view);
  return true;
}

const ghostTheme = EditorView.baseTheme({
  ".cm-ghost-text": {
    color: "var(--mute)",
    opacity: "0.55",
    pointerEvents: "none",
    userSelect: "none",
  },
});

/**
 * Ghost-text extensions. Include only when the shell enables `ghostText`.
 */
export function ghostTextExtension(): Extension[] {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      private timer: ReturnType<typeof setTimeout> | null = null;

      constructor(readonly view: EditorView) {
        this.decorations = buildGhostDecorations(view);
        this.schedule();
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.selectionSet ||
          update.transactions.some((tr) =>
            tr.effects.some((e) => e.is(setGhostEffect)),
          )
        ) {
          this.decorations = buildGhostDecorations(update.view);
        }

        if (update.docChanged || update.selectionSet) {
          this.schedule();
        }

        if (!isEditorInsertMode(update.view)) {
          if (update.view.state.field(ghostField, false) != null) {
            clearGhost(update.view);
          }
        }
      }

      destroy() {
        if (this.timer) clearTimeout(this.timer);
      }

      private schedule() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.timer = null;
          this.refresh();
        }, DEBOUNCE_MS);
      }

      private refresh() {
        const view = this.view;
        if (!isEditorInsertMode(view) || !view.state.selection.main.empty) {
          clearGhost(view);
          return;
        }
        const head = view.state.selection.main.head;
        const next = computeGhostSuggestion(view.state.doc.toString(), head);
        const nextText = next?.text ?? null;
        const cur = view.state.field(ghostField, false) ?? null;
        if (cur === nextText) return;
        view.dispatch({ effects: setGhostEffect.of(nextText) });
      }
    },
    { decorations: (v) => v.decorations },
  );

  // Below latex Tab (which is also Prec.high) would fight — ghost returns
  // false when empty so latex can handle. Prefer ghost when present.
  const keys = Prec.highest(
    keymap.of([
      { key: "Tab", run: acceptGhost },
      { key: "Escape", run: dismissGhost },
    ]),
  );

  return [ghostField, plugin, keys, ghostTheme];
}
