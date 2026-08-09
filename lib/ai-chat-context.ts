/**
 * Chat context packing for #57 (levels A–B).
 * Priority when budget is tight: selection > surrounding > document.
 */

/** Soft budget — raised with the 512 KiB chat route ceiling (#60). */
export const AI_DOCUMENT_BUDGET = 280_000;
export const AI_SELECTION_BUDGET = 24_000;
export const AI_SURROUNDING_BUDGET = 12_000;
export const AI_SURROUND_LINES = 8;

export type EditorCaret = {
  /** 0-based document offset */
  offset: number;
  /** 1-based */
  line: number;
  /** 1-based */
  column: number;
};

export type EditorContextSnapshot = {
  text: string;
  /** Empty when selection is collapsed. */
  selection: string;
  selectionFrom: number;
  selectionTo: number;
  caret: EditorCaret;
  /** ±N lines around the caret (or selection span). */
  surrounding: string;
};

export type PackedAiContext = {
  document: string;
  selection?: string;
  surrounding?: string;
  caret?: EditorCaret;
  /** True when the document field was truncated. */
  truncated: boolean;
};

export type PackAiContextOptions = {
  text: string;
  caretOffset?: number;
  selection?: string;
  surrounding?: string;
  caret?: EditorCaret;
  /** Studio: include selection/surrounding. Forge: file-only. */
  includeSelectionContext: boolean;
  documentBudget?: number;
};

export type SelectionContextPreview = {
  /** e.g. "L12" or "L12–14" or "L12:3" */
  label: string;
  /** One-line snippet (selection text or error message) */
  preview: string;
  lineFrom: number;
  lineTo: number;
  /** Visual tone for chat attachment chips. */
  tone?: "default" | "error";
};

/** 1-based line number for a document offset. */
export function lineNumberAt(text: string, pos: number): number {
  const clamped = Math.max(0, Math.min(pos, text.length));
  let line = 1;
  for (let i = 0; i < clamped; i++) {
    if (text[i] === "\n") line += 1;
  }
  return line;
}

/**
 * VS Code–style chip summary for the active editor selection.
 * Returns null when nothing is selected.
 */
export function selectionContextPreview(
  snap: EditorContextSnapshot,
): SelectionContextPreview | null {
  if (!snap.selection.trim()) return null;
  const from = snap.selectionFrom;
  const to = Math.max(from, snap.selectionTo - (snap.selectionTo > from ? 1 : 0));
  const lineFrom = lineNumberAt(snap.text, from);
  const lineTo = lineNumberAt(snap.text, to);
  const label =
    lineFrom === lineTo ? `L${lineFrom}` : `L${lineFrom}–${lineTo}`;
  const preview = snap.selection.replace(/\s+/g, " ").trim().slice(0, 56);
  return { label, preview, lineFrom, lineTo };
}

const OMIT_MARK = "\n…\n";

/**
 * Truncate `text` to `budget`, preferring a window around `focusOffset`
 * with head/tail retained when the focus window does not consume the budget.
 */
export function truncateAroundCaret(
  text: string,
  focusOffset: number,
  budget: number,
): { text: string; truncated: boolean } {
  if (text.length <= budget) {
    return { text, truncated: false };
  }
  if (budget < 32) {
    return { text: text.slice(0, budget), truncated: true };
  }

  const focus = Math.max(0, Math.min(focusOffset, text.length));
  const windowSize = Math.floor(budget * 0.55);
  const half = Math.floor(windowSize / 2);
  let winStart = Math.max(0, focus - half);
  const winEnd = Math.min(text.length, winStart + windowSize);
  winStart = Math.max(0, winEnd - windowSize);

  const remainder = budget - (winEnd - winStart) - OMIT_MARK.length * 2;
  const headBudget = Math.max(0, Math.floor(remainder / 2));
  const tailBudget = Math.max(0, remainder - headBudget);

  const head = text.slice(0, Math.min(headBudget, winStart));
  const mid = text.slice(winStart, winEnd);
  const tailStart = Math.max(winEnd, text.length - tailBudget);
  const tail = text.slice(tailStart);

  const parts: string[] = [];
  if (head) {
    parts.push(head);
    if (winStart > head.length) parts.push(OMIT_MARK.trim());
  } else if (winStart > 0) {
    parts.push("…");
  }
  parts.push(mid);
  if (tail && tailStart > winEnd) {
    parts.push(OMIT_MARK.trim());
    parts.push(tail);
  } else if (!tail && winEnd < text.length) {
    parts.push("…");
  }

  let packed = parts.join("\n");
  if (packed.length > budget) {
    packed = packed.slice(0, budget);
  }
  return { text: packed, truncated: true };
}

export function extractSurroundingLines(
  text: string,
  from: number,
  to: number,
  radius: number = AI_SURROUND_LINES,
): string {
  if (!text) return "";
  const lines = text.split("\n");

  const lineIndexAt = (pos: number): number => {
    const clamped = Math.max(0, Math.min(pos, text.length));
    let offset = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLen = lines[i]!.length + (i < lines.length - 1 ? 1 : 0);
      if (clamped < offset + lineLen || i === lines.length - 1) return i;
      offset += lineLen;
    }
    return lines.length - 1;
  };

  // Collapsed caret: use the line under the caret. Range: inclusive end char.
  const startLine = lineIndexAt(from);
  const endLine = lineIndexAt(to > from ? to - 1 : to);
  const lo = Math.max(0, Math.min(startLine, endLine) - radius);
  const hi = Math.min(
    lines.length - 1,
    Math.max(startLine, endLine) + radius,
  );
  return lines.slice(lo, hi + 1).join("\n");
}

export function clip(text: string, budget: number): string {
  if (text.length <= budget) return text;
  return `${text.slice(0, Math.max(0, budget - 1))}…`;
}

/**
 * Build the context payload for `/api/chat`.
 * Selection context is omitted when `includeSelectionContext` is false (Forge).
 */
export function packAiChatContext(
  opts: PackAiContextOptions,
): PackedAiContext {
  const budget = opts.documentBudget ?? AI_DOCUMENT_BUDGET;
  const focus =
    opts.caretOffset ??
    opts.caret?.offset ??
    Math.floor(opts.text.length / 2);
  const { text: document, truncated } = truncateAroundCaret(
    opts.text,
    focus,
    budget,
  );

  const packed: PackedAiContext = { document, truncated };

  if (opts.includeSelectionContext) {
    if (opts.selection?.trim()) {
      packed.selection = clip(opts.selection, AI_SELECTION_BUDGET);
    }
    if (opts.surrounding?.trim()) {
      packed.surrounding = clip(opts.surrounding, AI_SURROUNDING_BUDGET);
    }
    if (opts.caret) {
      packed.caret = opts.caret;
    }
  }

  return packed;
}
