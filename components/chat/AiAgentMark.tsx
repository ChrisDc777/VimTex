"use client";

import type { CSSProperties } from "react";
import type { AiAgentProfile } from "@/lib/ai-agents";
import { DEFAULT_AI_AGENT } from "@/lib/ai-agents";

type AiAgentMarkProps = {
  agent?: AiAgentProfile;
  size?: "sm" | "md";
};

/**
 * Filled monogram for AI chat identity — high contrast on dark chrome.
 */
export function AiAgentMark({
  agent = DEFAULT_AI_AGENT,
  size = "sm",
}: AiAgentMarkProps) {
  return (
    <span
      className={
        size === "md"
          ? "vt-ai-agent-mark vt-ai-agent-mark--md"
          : "vt-ai-agent-mark"
      }
      style={{ ["--ai-agent-accent"]: agent.accent } as CSSProperties}
      aria-hidden
      title={agent.name}
    >
      {agent.monogram}
    </span>
  );
}
