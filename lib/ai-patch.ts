/**
 * Ranged AI patch format (#87 / Wave D Level A).
 * Prefer over full-buffer @@@DOCUMENT; keeps hunk metadata for later
 * multi-accept and CM gutter diffs (#88).
 */

export const PATCH_EDIT_START = "@@@PATCH";
export const PATCH_EDIT_END = "@@@END";
export const PATCH_FIND = "@@@FIND";
export const PATCH_THEN = "@@@THEN";

export type AiPatchHunk = {
  /** Stable id within a proposal (h0, h1, …). */
  id: string;
  /** Exact text that must appear in the document (unique preferred). */
  find: string;
  /** Replacement text (may be empty to delete). */
  then: string;
};

export type AiPatchProposal = {
  hunks: AiPatchHunk[];
};

export type ApplyAiPatchResult =
  | { ok: true; after: string; hunks: AppliedAiPatchHunk[] }
  | { ok: false; error: string; hunks: AppliedAiPatchHunk[] };

export type AppliedAiPatchHunk = AiPatchHunk & {
  /** Byte offset of `find` in the document used for this apply step. */
  startOffset: number | null;
  endOffset: number | null;
  applied: boolean;
  error?: string;
};

/**
 * Parse the body between @@@PATCH and @@@END into ordered FIND/THEN hunks.
 * Returns null if the body has no valid hunks.
 */
export function parsePatchBody(body: string): AiPatchProposal | null {
  const normalized = body.replace(/^\r?\n/, "").replace(/\r?\n$/, "");
  if (!normalized.trim()) return null;

  const hunks: AiPatchHunk[] = [];
  const lines = normalized.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!.trimEnd();
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    if (line.trim() !== PATCH_FIND) {
      // Ignore stray prose inside the patch block.
      i += 1;
      continue;
    }
    i += 1;
    const findLines: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== PATCH_THEN) {
      if (lines[i]!.trim() === PATCH_FIND) break;
      findLines.push(lines[i]!);
      i += 1;
    }
    if (i >= lines.length || lines[i]!.trim() !== PATCH_THEN) {
      return null;
    }
    i += 1;
    const thenLines: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== PATCH_FIND &&
      lines[i]!.trim() !== PATCH_EDIT_END
    ) {
      thenLines.push(lines[i]!);
      i += 1;
    }

    const find = findLines.join("\n");
    const then = thenLines.join("\n");
    if (find.length === 0) {
      return null;
    }
    hunks.push({
      id: `h${hunks.length}`,
      find,
      then,
    });
  }

  if (hunks.length === 0) return null;
  return { hunks };
}

/**
 * Apply hunks sequentially (document order of emission). Each FIND must match
 * exactly once in the current working text; otherwise the hunk fails.
 * Failed hunks are skipped so later independent hunks can still apply
 * (Level A multi-hunk path). Returns ok:false only when nothing applied.
 */
export function applyAiPatch(
  document: string,
  proposal: AiPatchProposal,
): ApplyAiPatchResult {
  let working = document;
  const applied: AppliedAiPatchHunk[] = [];
  let successCount = 0;

  for (const hunk of proposal.hunks) {
    const first = working.indexOf(hunk.find);
    if (first === -1) {
      applied.push({
        ...hunk,
        startOffset: null,
        endOffset: null,
        applied: false,
        error: "FIND text not found in document",
      });
      continue;
    }
    const second = working.indexOf(hunk.find, first + 1);
    if (second !== -1) {
      applied.push({
        ...hunk,
        startOffset: first,
        endOffset: first + hunk.find.length,
        applied: false,
        error: "FIND text matches more than once; make the snippet unique",
      });
      continue;
    }

    working =
      working.slice(0, first) + hunk.then + working.slice(first + hunk.find.length);
    applied.push({
      ...hunk,
      startOffset: first,
      endOffset: first + hunk.find.length,
      applied: true,
    });
    successCount += 1;
  }

  if (successCount === 0) {
    return {
      ok: false,
      error: applied[0]?.error ?? "No hunks applied",
      hunks: applied,
    };
  }

  return { ok: true, after: working, hunks: applied };
}

/** Extract @@@PATCH…@@@END from raw assistant text, if present. */
export function extractPatchBlock(
  raw: string,
): { before: string; body: string; after: string } | null {
  const start = raw.indexOf(PATCH_EDIT_START);
  if (start === -1) return null;

  const afterStart = start + PATCH_EDIT_START.length;
  let bodyStart = afterStart;
  if (raw[bodyStart] === "\r") bodyStart += 1;
  if (raw[bodyStart] === "\n") bodyStart += 1;

  const end = raw.indexOf(PATCH_EDIT_END, bodyStart);
  if (end === -1) return null;

  return {
    before: raw.slice(0, start),
    body: raw.slice(bodyStart, end).replace(/\r?\n$/, ""),
    after: raw.slice(end + PATCH_EDIT_END.length),
  };
}
