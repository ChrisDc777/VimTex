/**
 * Pure formatters for #57 Level C auxiliary context blocks.
 * Kept import-free so node:test can load them without path aliases.
 */

export const AI_DIAGNOSTICS_BUDGET = 4_000;
export const AI_OUTLINE_BUDGET = 4_000;
export const AI_CITATIONS_BUDGET = 2_000;

export const AI_DIAGNOSTICS_MAX = 20;
export const AI_OUTLINE_MAX = 40;
export const AI_CITATIONS_MAX = 40;

export type AuxiliaryAiContext = {
  diagnostics?: string;
  outline?: string;
  citations?: string;
};

export function clipAuxText(text: string, budget: number): string {
  if (!text) return "";
  if (text.length <= budget) return text;
  return `${text.slice(0, Math.max(0, budget - 1))}…`;
}

/** Format live KaTeX/math diagnostics for the system prompt. */
export function formatAiDiagnostics(
  diags: ReadonlyArray<{
    line: number;
    column: number;
    message: string;
  }>,
  max = AI_DIAGNOSTICS_MAX,
): string {
  if (diags.length === 0) return "";
  const lines = diags.slice(0, max).map((d) => {
    const msg = d.message.replace(/\s+/g, " ").trim().slice(0, 160);
    return `L${d.line}:${d.column}  ${msg}`;
  });
  if (diags.length > max) {
    lines.push(`… +${diags.length - max} more`);
  }
  return lines.join("\n");
}

/** Flat outline lines from outline nodes. */
export function formatAiOutline(
  nodes: ReadonlyArray<{
    level: string;
    title: string;
    line: number;
    depth: number;
  }>,
  max = AI_OUTLINE_MAX,
): string {
  if (nodes.length === 0) return "";
  const lines = nodes.slice(0, max).map((n) => {
    const indent = "  ".repeat(Math.max(0, n.depth));
    const title = n.title.replace(/\s+/g, " ").trim().slice(0, 80);
    return `${indent}L${n.line} \\${n.level}{${title}}`;
  });
  if (nodes.length > max) {
    lines.push(`… +${nodes.length - max} more`);
  }
  return lines.join("\n");
}

/** Citation keys available in the note (BibTeX / \\bibitem). */
export function formatAiCitations(
  entries: ReadonlyArray<{ key: string; kind: string }>,
  max = AI_CITATIONS_MAX,
): string {
  if (entries.length === 0) return "";
  const lines = entries.slice(0, max).map((e) => `${e.key} (${e.kind})`);
  if (entries.length > max) {
    lines.push(`… +${entries.length - max} more`);
  }
  return lines.join("\n");
}
