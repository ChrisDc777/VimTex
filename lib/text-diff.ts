/**
 * Minimal line-oriented diff for AI proposal preview (#27).
 * Not a full Myers implementation — enough to review full-buffer replacements.
 */

export type DiffLineKind = "same" | "add" | "del";

export type DiffLine = {
  kind: DiffLineKind;
  text: string;
  /** 1-based line number in the "before" doc (deletes/same). */
  beforeLine?: number;
  /** 1-based line number in the "after" doc (adds/same). */
  afterLine?: number;
};

/**
 * Compute a simple LCS-backed line diff. Caps work for very large buffers
 * by falling back to a coarse before/after block when either side exceeds
 * `maxLines`.
 */
export function diffLines(
  before: string,
  after: string,
  maxLines = 2_000,
): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  if (a.length > maxLines || b.length > maxLines) {
    return coarseDiff(a, b);
  }
  return lcsDiff(a, b);
}

/**
 * 1-based lines in `before` that a pending AI edit will change or remove (#88).
 * Pure additions mark the preceding before-line when available.
 */
export function changedBeforeLines(before: string, after: string): number[] {
  if (before === after) return [];
  const lines = new Set<number>();
  let lastBeforeLine = 0;
  for (const row of diffLines(before, after)) {
    if (row.beforeLine != null) lastBeforeLine = row.beforeLine;
    if (row.kind === "del" && row.beforeLine != null) {
      lines.add(row.beforeLine);
    } else if (row.kind === "add" && lastBeforeLine > 0) {
      lines.add(lastBeforeLine);
    }
  }
  return [...lines].sort((a, b) => a - b);
}

function coarseDiff(a: string[], b: string[]): DiffLine[] {
  const out: DiffLine[] = [];
  for (let i = 0; i < a.length; i++) {
    out.push({ kind: "del", text: a[i]!, beforeLine: i + 1 });
  }
  for (let i = 0; i < b.length; i++) {
    out.push({ kind: "add", text: b[i]!, afterLine: i + 1 });
  }
  return out;
}

function lcsDiff(a: string[], b: string[]): DiffLine[] {
  const n = a.length;
  const m = b.length;
  const dp: Uint16Array[] = Array.from(
    { length: n + 1 },
    () => new Uint16Array(m + 1),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i]![j] = (dp[i + 1]![j + 1]! + 1) as number;
      else dp[i]![j] = Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!) as number;
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({
        kind: "same",
        text: a[i]!,
        beforeLine: i + 1,
        afterLine: j + 1,
      });
      i += 1;
      j += 1;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ kind: "del", text: a[i]!, beforeLine: i + 1 });
      i += 1;
    } else {
      out.push({ kind: "add", text: b[j]!, afterLine: j + 1 });
      j += 1;
    }
  }
  while (i < n) {
    out.push({ kind: "del", text: a[i]!, beforeLine: i + 1 });
    i += 1;
  }
  while (j < m) {
    out.push({ kind: "add", text: b[j]!, afterLine: j + 1 });
    j += 1;
  }
  return out;
}

export function summarizeDiff(lines: DiffLine[]): {
  added: number;
  removed: number;
} {
  let added = 0;
  let removed = 0;
  for (const line of lines) {
    if (line.kind === "add") added += 1;
    else if (line.kind === "del") removed += 1;
  }
  return { added, removed };
}
