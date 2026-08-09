/**
 * Token usage helpers for AI chat (#60).
 * Stream responses may append a trailer; JSON responses carry a `usage` field.
 */

export const AI_USAGE_TRAILER_PREFIX = "@@@VIMTEX_USAGE ";

export type AiTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AiKeySource = "user" | "server";

export function normalizeAiUsage(raw: unknown): AiTokenUsage | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const inputTokens = num(o.inputTokens ?? o.promptTokens);
  const outputTokens = num(o.outputTokens ?? o.completionTokens);
  const totalTokens =
    num(o.totalTokens) ??
    (inputTokens != null || outputTokens != null
      ? (inputTokens ?? 0) + (outputTokens ?? 0)
      : undefined);
  if (
    inputTokens == null &&
    outputTokens == null &&
    totalTokens == null
  ) {
    return null;
  }
  return { inputTokens, outputTokens, totalTokens };
}

function num(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return undefined;
  return Math.floor(v);
}

/** Split streamed assistant text from an optional usage trailer. */
export function stripAiUsageTrailer(raw: string): {
  message: string;
  usage: AiTokenUsage | null;
} {
  const idx = raw.lastIndexOf(`\n${AI_USAGE_TRAILER_PREFIX}`);
  const atStart = raw.startsWith(AI_USAGE_TRAILER_PREFIX) ? 0 : -1;
  const cut = idx >= 0 ? idx : atStart;
  if (cut < 0) return { message: raw, usage: null };
  const jsonStart =
    cut === 0
      ? AI_USAGE_TRAILER_PREFIX.length
      : cut + 1 + AI_USAGE_TRAILER_PREFIX.length;
  const json = raw.slice(jsonStart).trim();
  const message = raw.slice(0, cut === 0 ? 0 : cut).replace(/\s+$/, "");
  try {
    return { message, usage: normalizeAiUsage(JSON.parse(json)) };
  } catch {
    return { message: raw, usage: null };
  }
}

export function formatAiUsageTrailer(usage: AiTokenUsage): string {
  return `\n${AI_USAGE_TRAILER_PREFIX}${JSON.stringify({
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  })}`;
}

/** Compact label for chat meta (e.g. "1.2k → 340 · 1.5k tok"). */
export function formatAiUsageLabel(usage: AiTokenUsage): string {
  const inT = usage.inputTokens;
  const outT = usage.outputTokens;
  const total = usage.totalTokens;
  if (inT != null && outT != null) {
    return `${fmtCount(inT)} → ${fmtCount(outT)}${
      total != null ? ` · ${fmtCount(total)} tok` : " tok"
    }`;
  }
  if (total != null) return `${fmtCount(total)} tok`;
  if (inT != null) return `${fmtCount(inT)} in`;
  if (outT != null) return `${fmtCount(outT)} out`;
  return "";
}

function fmtCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}
