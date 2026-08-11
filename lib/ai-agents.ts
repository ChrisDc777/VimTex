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
  /** Solid accent color (hex) for mark fill + name. */
  accent: string;
};

/** Default room AI — warm sunset against cool Studio breeze chrome. */
export const VIMOTHY_AGENT: AiAgentProfile = {
  id: "vimothy",
  name: "Vimothy",
  monogram: "V",
  accent: "#ff7a17",
};

export const DEFAULT_AI_AGENT = VIMOTHY_AGENT;

export function agentForId(id: string | null | undefined): AiAgentProfile {
  if (!id || id === VIMOTHY_AGENT.id) return VIMOTHY_AGENT;
  return VIMOTHY_AGENT;
}
