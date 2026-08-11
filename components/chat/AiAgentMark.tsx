"use client";

import type { AiAgentProfile } from "@/lib/ai-agents";
import { DEFAULT_AI_AGENT } from "@/lib/ai-agents";

type AiAgentMarkProps = {
  agent?: AiAgentProfile;
  size?: "sm" | "md";
};

/**
 * Compact monogram for AI chat identity — swappable when more agents appear.
 */
export function AiAgentMark({
  agent = DEFAULT_AI_AGENT,
  size = "sm",
}: AiAgentMarkProps) {
  const dim = size === "md" ? 18 : 14;
  return (
    <span
      className={
        size === "md" ? "vt-ai-agent-mark vt-ai-agent-mark--md" : "vt-ai-agent-mark"
      }
      style={{
        width: dim,
        height: dim,
        color: agent.accent,
        borderColor: `color-mix(in srgb, ${agent.accent} 55%, transparent)`,
        background: `color-mix(in srgb, ${agent.accent} 16%, transparent)`,
      }}
      aria-hidden
      title={agent.name}
    >
      {agent.monogram}
    </span>
  );
}
