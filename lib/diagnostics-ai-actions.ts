import {
  extractSurroundingLines,
  type SelectionContextPreview,
} from "@/lib/ai-chat-context";
import type { MathDiagnostic } from "@/lib/render-note";

export type DiagnosticAiRequest = {
  /** Short line shown in the room chat bubble. */
  chatText: string;
  /** Full prompt sent to the model (not dumped into chat). */
  instruction: string;
  /** Compact chip under the user message — line + error, no broken TeX. */
  attachment: SelectionContextPreview & { tone: "error" };
};

function attachmentFor(
  diag: MathDiagnostic,
): SelectionContextPreview & { tone: "error" } {
  return {
    label: `L${diag.line}:${diag.column}`,
    preview: diag.message.replace(/\s+/g, " ").trim().slice(0, 72),
    lineFrom: diag.line,
    lineTo: diag.line,
    tone: "error",
  };
}

export function buildDiagnosticExplainRequest(
  note: string,
  diag: MathDiagnostic,
): DiagnosticAiRequest {
  const surrounding = extractSurroundingLines(note, diag.from, diag.to, 4);
  return {
    chatText: `Explain the math error at L${diag.line}:${diag.column}`,
    instruction: [
      `Explain this KaTeX / TeX error at L${diag.line}:${diag.column}.`,
      `Error: ${diag.message}`,
      "",
      "Surrounding source (for context only — do not paste it back verbatim):",
      surrounding || "(empty)",
      "",
      "Be brief. Do not change the note unless asked.",
    ].join("\n"),
    attachment: attachmentFor(diag),
  };
}

export function buildDiagnosticFixRequest(
  note: string,
  diag: MathDiagnostic,
): DiagnosticAiRequest {
  const surrounding = extractSurroundingLines(note, diag.from, diag.to, 4);
  return {
    chatText: `Fix the math error at L${diag.line}:${diag.column}`,
    instruction: [
      `Fix the KaTeX / TeX error at L${diag.line}:${diag.column}.`,
      `Error: ${diag.message}`,
      "",
      "Surrounding source (for context only — do not paste it back verbatim):",
      surrounding || "(empty)",
      "",
      "Propose a full-document edit with the corrected note.",
    ].join("\n"),
    attachment: attachmentFor(diag),
  };
}
