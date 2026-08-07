/** Markers the model uses to propose a full-buffer replacement. */
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
  /** Full document replacement, if the model proposed one. */
  documentEdit: string | null;
};

export type SystemPromptContext = {
  document: string;
  selection?: string;
  surrounding?: string;
  caret?: { line: number; column: number; offset: number };
  truncated?: boolean;
};

export function buildSystemPrompt(
  documentOrContext: string | SystemPromptContext,
): string {
  const ctx: SystemPromptContext =
    typeof documentOrContext === "string"
      ? { document: documentOrContext }
      : documentOrContext;

  const sections: string[] = [
    `You are the VimTex assistant (Vimothy). Collaborators tag you in room chat with @vimothy (aliases @ai / @vimtex); you receive only that single instruction plus the current document context — no prior chat history.`,
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

  sections.push(`Rules:
- Help with math, LaTeX, and editing the note.
- Keep chat replies concise.
- When a primary selection is provided, prefer editing or explaining that region unless the instruction clearly targets the whole note.
- When the instruction asks you to change the note (add formulas, rewrite, fix TeX, etc.), propose the FULL updated document by ending your reply with exactly:

${DOC_EDIT_START}
<entire new document content>
${DOC_EDIT_END}

- The content between the markers must be the complete note (not a diff). Preserve unrelated parts unless asked to rewrite everything.
- If you are only answering a question and not changing the note, do not include the markers.
- Prefer KaTeX-friendly TeX. Do not wrap the whole document in a LaTeX documentclass.
- Math in chat replies: use \\( \\) for inline and \\[ \\] for display. Never wrap math in backticks, **bold**, or markdown code fences — that breaks rendering.`);

  return sections.join("\n\n");
}

export function parseAssistantReply(raw: string): ParsedAssistantReply {
  const start = raw.indexOf(DOC_EDIT_START);
  if (start === -1) {
    return { message: raw.trim(), documentEdit: null };
  }

  const afterStart = start + DOC_EDIT_START.length;
  let bodyStart = afterStart;
  if (raw[bodyStart] === "\r") bodyStart += 1;
  if (raw[bodyStart] === "\n") bodyStart += 1;

  const end = raw.indexOf(DOC_EDIT_END, bodyStart);
  if (end === -1) {
    return { message: raw.trim(), documentEdit: null };
  }

  const documentEdit = raw.slice(bodyStart, end).replace(/\r?\n$/, "");
  const before = raw.slice(0, start).trim();
  const after = raw.slice(end + DOC_EDIT_END.length).trim();
  const message = [before, after].filter(Boolean).join("\n\n").trim() ||
    "Updated the note.";

  return { message, documentEdit };
}
