/**
 * Map raw OpenRouter / SDK errors into short, actionable copy for chat + toasts.
 */
export function formatAiError(
  raw: string,
  opts?: { model?: string; modelLabel?: string },
): string {
  const text = raw.trim() || "Unknown error";
  const lower = text.toLowerCase();
  const label = opts?.modelLabel || opts?.model || "That model";

  if (
    lower.includes("no endpoints") ||
    lower.includes("model not found") ||
    lower.includes("is not available") ||
    (lower.includes("404") && lower.includes("model"))
  ) {
    return `${label} isn’t available right now (OpenRouter has no live endpoint). Pick another model in the chat picker.`;
  }

  if (
    lower.includes("data policy") ||
    lower.includes("free model publication")
  ) {
    return `${label} is blocked by the OpenRouter key’s data-policy settings. Use another free model, or a BYOK model with your own key.`;
  }

  if (
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("too many requests")
  ) {
    return `${label} is rate-limited. Wait a moment or switch models.`;
  }

  if (
    lower.includes("unauthorized") ||
    lower.includes("invalid api key") ||
    lower.includes("401") ||
    lower.includes("403")
  ) {
    return "AI key rejected. Check OPENROUTER_API_KEY or the key in the model picker.";
  }

  if (
    lower.includes("requires your own") ||
    (lower.includes("api key") && lower.includes("model picker"))
  ) {
    return text;
  }

  if (lower.includes("empty reply")) {
    return "The model returned an empty reply. Try again or switch models.";
  }

  const cleaned = text
    .replace(/^Error:\s*/i, "")
    .replace(/^AI request failed:\s*/i, "");
  if (cleaned.length > 220) {
    return `${cleaned.slice(0, 217)}…`;
  }
  return cleaned;
}
