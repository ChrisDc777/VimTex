/** Primary model mention; @ai and @vimtex remain accepted aliases. */
export const AI_MENTION_TAG = "vimothy" as const;

/** Case-insensitive @vimothy / @ai / @vimtex at a word boundary. */
const AI_MENTION_RE = /(^|[\s])@(?:vimothy|ai|vimtex)\b/gi;

export function mentionsAi(text: string): boolean {
  AI_MENTION_RE.lastIndex = 0;
  return AI_MENTION_RE.test(text);
}

/** Strip model mention tags for the OpenRouter instruction; keep surrounding text. */
export function stripAiMention(text: string): string {
  return text
    .replace(/(^|[\s])@(?:vimothy|ai|vimtex)\b/gi, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export const AI_MENTION_SUGGESTIONS = [AI_MENTION_TAG] as const;
