import katex from "katex";

export type NoteSegment =
  | { type: "text"; content: string; from: number; to: number }
  | {
      type: "math";
      content: string;
      display: boolean;
      from: number;
      to: number;
      bodyFrom: number;
      bodyTo: number;
    };

/** Explicit TeX delimiters only — no `$` / `$$`. */
const DELIMITERS: Array<{
  open: string;
  close: string;
  display: boolean;
}> = [
  { open: "\\[", close: "\\]", display: true },
  { open: "\\(", close: "\\)", display: false },
];

/** A line looks like LaTeX if it contains a command like \frac. */
const TEX_COMMAND = /\\[a-zA-Z]+/;

function startsWithAt(text: string, index: number, token: string): boolean {
  return text.startsWith(token, index);
}

function findClosing(text: string, from: number, close: string): number {
  let i = from;
  while (i < text.length) {
    if (startsWithAt(text, i, close)) {
      return i;
    }
    // Skip a TeX escape only when it is not the closing delimiter itself.
    if (
      text[i] === "\\" &&
      i + 1 < text.length &&
      !startsWithAt(text, i, close)
    ) {
      i += 2;
      continue;
    }
    i += 1;
  }
  return -1;
}

function looksLikeTex(content: string): boolean {
  return TEX_COMMAND.test(content);
}

/**
 * Walk explicit \( \) / \[ \] first, then treat remaining lines that contain
 * TeX commands as display math (no $ needed).
 */
export function parseNote(text: string): NoteSegment[] {
  const explicit = parseExplicitDelimiters(text);
  const segments: NoteSegment[] = [];

  for (const seg of explicit) {
    if (seg.type === "math") {
      segments.push(seg);
      continue;
    }
    segments.push(...autoMathLines(seg.content, seg.from));
  }

  return mergeAdjacentText(segments);
}

function parseExplicitDelimiters(text: string): NoteSegment[] {
  const segments: NoteSegment[] = [];
  let i = 0;
  let textStart = 0;

  while (i < text.length) {
    let matched: (typeof DELIMITERS)[number] | null = null;

    for (const delim of DELIMITERS) {
      if (startsWithAt(text, i, delim.open)) {
        matched = delim;
        break;
      }
    }

    if (!matched) {
      i += 1;
      continue;
    }

    const bodyStart = i + matched.open.length;
    const closeAt = findClosing(text, bodyStart, matched.close);

    if (closeAt === -1) {
      i += 1;
      continue;
    }

    const body = text.slice(bodyStart, closeAt);

    // Leave instructional empty delimiters like \( \) / \[ \] as literal text.
    // Must check BEFORE emitting a text segment, or textStart stays stale and
    // the same region is emitted twice (corrupting the preview).
    if (body.trim().length === 0) {
      i += 1;
      continue;
    }

    if (i > textStart) {
      segments.push({
        type: "text",
        content: text.slice(textStart, i),
        from: textStart,
        to: i,
      });
    }

    const spanEnd = closeAt + matched.close.length;

    segments.push({
      type: "math",
      content: body,
      display: matched.display,
      from: i,
      to: spanEnd,
      bodyFrom: bodyStart,
      bodyTo: closeAt,
    });

    i = spanEnd;
    textStart = spanEnd;
  }

  if (textStart < text.length) {
    segments.push({
      type: "text",
      content: text.slice(textStart),
      from: textStart,
      to: text.length,
    });
  }

  return segments;
}

/** Lines with TeX commands become display math; other lines stay text. */
function autoMathLines(content: string, baseOffset: number): NoteSegment[] {
  if (!content) return [];

  const segments: NoteSegment[] = [];
  const parts = content.split(/(\n)/);
  let offset = 0;

  for (const part of parts) {
    const absFrom = baseOffset + offset;
    const absTo = absFrom + part.length;
    offset += part.length;

    if (part === "\n" || part.length === 0) {
      if (part.length > 0) {
        segments.push({
          type: "text",
          content: part,
          from: absFrom,
          to: absTo,
        });
      }
      continue;
    }

    const trimmed = part.trim();
    if (trimmed && looksLikeTex(trimmed)) {
      const lead = part.match(/^\s*/)?.[0].length ?? 0;
      const trail = part.match(/\s*$/)?.[0].length ?? 0;
      const bodyFrom = absFrom + lead;
      const bodyTo = absTo - trail;

      if (lead > 0) {
        segments.push({
          type: "text",
          content: part.slice(0, lead),
          from: absFrom,
          to: bodyFrom,
        });
      }
      segments.push({
        type: "math",
        content: part.slice(lead, part.length - trail),
        display: true,
        from: bodyFrom,
        to: bodyTo,
        bodyFrom,
        bodyTo,
      });
      if (trail > 0) {
        segments.push({
          type: "text",
          content: part.slice(part.length - trail),
          from: bodyTo,
          to: absTo,
        });
      }
      continue;
    }

    segments.push({
      type: "text",
      content: part,
      from: absFrom,
      to: absTo,
    });
  }

  return segments;
}

function mergeAdjacentText(segments: NoteSegment[]): NoteSegment[] {
  const out: NoteSegment[] = [];
  for (const seg of segments) {
    const prev = out[out.length - 1];
    if (seg.type === "text" && prev?.type === "text" && prev.to === seg.from) {
      out[out.length - 1] = {
        type: "text",
        content: prev.content + seg.content,
        from: prev.from,
        to: seg.to,
      };
    } else {
      out.push(seg);
    }
  }
  return out;
}

export function renderMathToHtml(
  tex: string,
  displayMode: boolean,
): { html: string; error?: string } {
  try {
    return {
      html: katex.renderToString(tex.trim(), {
        displayMode,
        throwOnError: true,
        strict: "ignore",
        trust: false,
      }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid math";
    return {
      html: `<span class="math-error">${escapeHtml(tex || message)}</span>`,
      error: message,
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeText(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

/**
 * Full-document HTML for Split preview.
 * Never nests block <div> math inside <p> (browsers "fix" that and scramble content).
 */
export function renderNoteToHtml(text: string): string {
  const segments = parseNote(text);
  if (segments.length === 0) {
    return `<p class="preview-empty"></p>`;
  }

  const blocks: string[] = [];
  let inline = "";

  const flushInline = () => {
    if (!inline) return;
    const paras = inline.split(/(?:<br \/>){2,}/);
    for (const para of paras) {
      const cleaned = para.replace(/^(?:<br \/>)+|(?:<br \/>)+$/g, "");
      if (cleaned) {
        blocks.push(`<p>${cleaned}</p>`);
      }
    }
    inline = "";
  };

  for (const seg of segments) {
    if (seg.type === "text") {
      inline += escapeText(seg.content);
      continue;
    }
    const { html } = renderMathToHtml(seg.content, seg.display);
    if (seg.display) {
      flushInline();
      blocks.push(`<div class="katex-display-wrap">${html}</div>`);
    } else {
      inline += html;
    }
  }
  flushInline();

  return blocks.join("") || `<p class="preview-empty"></p>`;
}

/** Math spans whose range contains the cursor (Realtime raw-source editing). */
export function findMathAtCursor(
  text: string,
  cursor: number,
): NoteSegment | null {
  for (const seg of parseNote(text)) {
    if (seg.type === "math" && cursor >= seg.from && cursor <= seg.to) {
      return seg;
    }
  }
  return null;
}
