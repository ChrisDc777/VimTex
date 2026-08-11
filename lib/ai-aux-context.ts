/**
 * #57 Level C — compact auxiliary context for Studio chat.
 * Diagnostics, TeX outline, and note-local citation keys.
 */

import {
  AI_CITATIONS_BUDGET,
  AI_DIAGNOSTICS_BUDGET,
  AI_OUTLINE_BUDGET,
  clipAuxText,
  formatAiCitations,
  formatAiDiagnostics,
  formatAiOutline,
  type AuxiliaryAiContext,
} from "@/lib/ai-aux-format";
import { parseBibEntriesFromNote } from "@/lib/bib-parse";
import { renderNoteDiagnostics } from "@/lib/render-note";
import { flattenOutline, parseTexOutline } from "@/lib/tex-outline";

export type { AuxiliaryAiContext } from "@/lib/ai-aux-format";
export {
  AI_CITATIONS_BUDGET,
  AI_CITATIONS_MAX,
  AI_DIAGNOSTICS_BUDGET,
  AI_DIAGNOSTICS_MAX,
  AI_OUTLINE_BUDGET,
  AI_OUTLINE_MAX,
  formatAiCitations,
  formatAiDiagnostics,
  formatAiOutline,
} from "@/lib/ai-aux-format";

/**
 * Build Level C blocks from the full note.
 * Priority when clipping: diagnostics > outline > citations.
 */
export function buildAuxiliaryAiContext(text: string): AuxiliaryAiContext {
  if (!text) return {};

  const diagnostics = clipAuxText(
    formatAiDiagnostics(renderNoteDiagnostics(text)),
    AI_DIAGNOSTICS_BUDGET,
  );
  const outline = clipAuxText(
    formatAiOutline(flattenOutline(parseTexOutline(text))),
    AI_OUTLINE_BUDGET,
  );
  const citations = clipAuxText(
    formatAiCitations(parseBibEntriesFromNote(text)),
    AI_CITATIONS_BUDGET,
  );

  const out: AuxiliaryAiContext = {};
  if (diagnostics) out.diagnostics = diagnostics;
  if (outline) out.outline = outline;
  if (citations) out.citations = citations;
  return out;
}
