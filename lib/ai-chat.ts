import {
  PATCH_EDIT_END,
  PATCH_EDIT_START,
  PATCH_FIND,
  PATCH_THEN,
  extractPatchBlock,
  parsePatchBody,
  type AiPatchProposal,
} from "@/lib/ai-patch";
import { DERIVATION_COACH_SYSTEM_RULES } from "@/lib/derivation-coach";

/** Markers the model uses to propose a full-buffer replacement (fallback). */
export const DOC_EDIT_START = "@@@DOCUMENT";
export const DOC_EDIT_END = "@@@END";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ParsedAssistantReply = {
  /** User-visible chat text (edit block stripped). */
  message: string;
  /** Full document replacement, if the model proposed one (fallback). */
  documentEdit: string | null;
  /** Ranged patch proposal (#87); preferred over documentEdit when present. */
  patch: AiPatchProposal | null;
};

export type SystemPromptContext = {
  document: string;
  selection?: string;
  surrounding?: string;
  caret?: { line: number; column: number; offset: number };
  truncated?: boolean;
  /** Chat-only derivation coach (#84) — no patch/document edit format. */
  coach?: boolean;
};

export function buildSystemPrompt(
  documentOrContext: string | SystemPromptContext,
): string {
  const ctx: SystemPromptContext =
    typeof documentOrContext === "string"
      ? { document: documentOrContext }
      : documentOrContext;

  const sections: string[] = [
    `You are the VimTex assistant (Vimothy). Collaborators tag you in room chat with @vimothy (aliases @ai / @vimtex). You receive the latest instruction plus the current document context. When prior @vimothy turns are included as chat messages, use them only for follow-ups (e.g. "make it shorter"); prefer the latest user instruction and the live document over stale history.`,
  ];

  if (ctx.selection?.trim()) {
    sections.push(
      `Primary selection (highest priority — ground answers and edits here first):
-----
${ctx.selection}
-----`,
    );
  }

  if (ctx.surrounding?.trim()) {
    sections.push(
      `Surrounding lines around the caret/selection:
-----
${ctx.surrounding}
-----`,
    );
  }

  if (ctx.caret) {
    sections.push(
      `Caret position: line ${ctx.caret.line}, column ${ctx.caret.column} (offset ${ctx.caret.offset}).`,
    );
  }

  const truncNote = ctx.truncated
    ? "\n(Note: the buffer below was truncated around the caret to fit size limits.)"
    : "";

  sections.push(
    `Current document buffer:${truncNote}
-----
${ctx.document}
-----`,
  );

  if (ctx.coach) {
    sections.push(DERIVATION_COACH_SYSTEM_RULES);
    sections.push(
      `Rules:
- Help with math and LaTeX reasoning in chat.
- Keep replies concise and step-by-step.
- Prefer KaTeX-friendly TeX. Math in chat: use \\( \\) for inline and \\[ \\] for display. Never wrap math in backticks, **bold**, or markdown code fences.`,
    );
    return sections.join("\n\n");
  }

  sections.push(`Rules:
- Help with math, LaTeX, and editing the note.
- Keep chat replies concise.
- When a primary selection is provided, prefer editing or explaining that region unless the instruction clearly targets the whole note.
- When the instruction asks you to change the note (add formulas, rewrite, fix TeX, etc.), prefer a ranged patch ending your reply with:

${PATCH_EDIT_START}
${PATCH_FIND}
<exact snippet from the current document — unique enough to match once>
${PATCH_THEN}
<replacement text for that snippet>
${PATCH_FIND}
<optional second snippet>
${PATCH_THEN}
<optional second replacement>
${PATCH_EDIT_END}

- FIND text must match the document exactly (including whitespace) and should appear only once. Use multiple FIND/THEN pairs for independent edits.
- Use full-buffer replacement only when rewriting most of the note or a ranged patch is impractical:

${DOC_EDIT_START}
<entire new document content>
${DOC_EDIT_END}

- Do not emit both a patch and a full-document block. Prefer the patch form.
- If you are only answering a question and not changing the note, do not include the markers.
- Prefer KaTeX-friendly TeX. Do not wrap the whole document in a LaTeX documentclass.
- Math in chat replies: use \\( \\) for inline and \\[ \\] for display. Never wrap math in backticks, **bold**, or markdown code fences — that breaks rendering.`);

  return sections.join("\n\n");
}

function stripEditMessage(
  before: string,
  after: string,
  fallback: string,
): string {
  const message = [before.trim(), after.trim()].filter(Boolean).join("\n\n").trim();
  return message || fallback;
}

export function parseAssistantReply(raw: string): ParsedAssistantReply {
  const patchBlock = extractPatchBlock(raw);
  if (patchBlock) {
    const proposal = parsePatchBody(patchBlock.body);
    if (proposal) {
      return {
        message: stripEditMessage(
          patchBlock.before,
          patchBlock.after,
          "Updated the note.",
        ),
        documentEdit: null,
        patch: proposal,
      };
    }
  }

  const start = raw.indexOf(DOC_EDIT_START);
  if (start === -1) {
    return { message: raw.trim(), documentEdit: null, patch: null };
  }

  const afterStart = start + DOC_EDIT_START.length;
  let bodyStart = afterStart;
  if (raw[bodyStart] === "\r") bodyStart += 1;
  if (raw[bodyStart] === "\n") bodyStart += 1;

  const end = raw.indexOf(DOC_EDIT_END, bodyStart);
  if (end === -1) {
    return { message: raw.trim(), documentEdit: null, patch: null };
  }

  const documentEdit = raw.slice(bodyStart, end).replace(/\r?\n$/, "");
  return {
    message: stripEditMessage(
      raw.slice(0, start),
      raw.slice(end + DOC_EDIT_END.length),
      "Updated the note.",
    ),
    documentEdit,
    patch: null,
  };
}

/** Earliest edit-marker index for streaming UI (hide payload while tokens arrive). */
export function earliestEditMarkerIndex(text: string): number {
  const markers = [PATCH_EDIT_START, DOC_EDIT_START];
  let best = -1;
  for (const m of markers) {
    const i = text.indexOf(m);
    if (i !== -1 && (best === -1 || i < best)) best = i;
  }
  return best;
}
