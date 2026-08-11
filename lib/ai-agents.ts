/**
 * AI agent profiles for chat identity.
 * Start with Vimothy; later agents can share this shape (accent, mark, name).
 */

export type AiAgentProfile = {
  id: string;
  /** Display name in chat chrome. */
  name: string;
  /** Single-letter mark in the avatar. */
  monogram: string;
  /**
   * Accent for name / mark. Prefer a CSS variable so Studio/Forge themes
   * can retint without code changes.
   */
  accent: string;
};

/** Default room AI — warm sunset against cool Studio breeze chrome. */
export const VIMOTHY_AGENT: AiAgentProfile = {
  id: "vimothy",
  name: "Vimothy",
  monogram: "V",
  accent: "var(--ai-agent-accent, var(--accent-sunset, #ff7a17))",
};

export const DEFAULT_AI_AGENT = VIMOTHY_AGENT;

export function agentForId(id: string | null | undefined): AiAgentProfile {
  if (!id || id === VIMOTHY_AGENT.id) return VIMOTHY_AGENT;
  return VIMOTHY_AGENT;
}
