import {
  extractSurroundingLines,
} from "@/lib/ai-chat-context";
import type { MathDiagnostic } from "@/lib/render-note";

export function buildDiagnosticExplainInstruction(
  note: string,
  diag: MathDiagnostic,
): string {
  const surrounding = extractSurroundingLines(note, diag.from, diag.to, 4);
  return [
    `Explain this KaTeX / TeX error at L${diag.line}:${diag.column}.`,
    `Error: ${diag.message}`,
    "",
    "Surrounding source:",
    surrounding || "(empty)",
    "",
    "Be brief. Do not change the note unless asked.",
  ].join("\n");
}

export function buildDiagnosticFixInstruction(
  note: string,
  diag: MathDiagnostic,
): string {
  const surrounding = extractSurroundingLines(note, diag.from, diag.to, 4);
  return [
    `Fix the KaTeX / TeX error at L${diag.line}:${diag.column}.`,
    `Error: ${diag.message}`,
    "",
    "Surrounding source:",
    surrounding || "(empty)",
    "",
    "Propose a full-document edit with the corrected note.",
  ].join("\n");
}
