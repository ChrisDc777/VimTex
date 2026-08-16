"use client";

import { ThinkingShimmer } from "@/components/beui/agents/loading-states/thinking-shimmer";

type EnhancedThinkingProps = {
  busy?: boolean;
};

export function EnhancedThinking({ busy = true }: EnhancedThinkingProps) {
  return (
    <ThinkingShimmer className="text-xs text-mute">
      {busy ? "Vimothy is responding…" : "Thinking…"}
    </ThinkingShimmer>
  );
}
