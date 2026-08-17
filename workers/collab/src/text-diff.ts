export type DiffLineKind = "same" | "add" | "del";

export type DiffLine = {
  kind: DiffLineKind;
  text: string;
  beforeLine?: number;
  afterLine?: number;
};

export function diffLines(
  before: string,
  after: string,
  maxLines = 2_000,
): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  if (a.length > maxLines || b.length > maxLines) {
    const out: DiffLine[] = [];
    for (let i = 0; i < a.length; i++) {
      out.push({ kind: "del", text: a[i]!, beforeLine: i + 1 });
    }
    for (let i = 0; i < b.length; i++) {
      out.push({ kind: "add", text: b[i]!, afterLine: i + 1 });
    }
    return out;
  }
  return lcsDiff(a, b);
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
