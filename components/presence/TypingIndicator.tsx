"use client";

import type { PeerInfo } from "@/lib/types";

type TypingIndicatorProps = {
  /** Peers whose awareness `typing` flag is currently live. */
  typing: PeerInfo[];
  selfClientId?: number | null;
};

function formatNames(names: string[]): string {
  if (names.length === 1) return `${names[0]} is typing`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
  const shown = names.slice(0, 2).join(", ");
  return `${shown}, and ${names.length - 2} more are typing`;
}

/**
 * "X is typing…" line with animated dots, rendered above the chat composer.
 * Announces politely so screen-reader users hear peer activity.
 */
export function TypingIndicator({ typing, selfClientId }: TypingIndicatorProps) {
  const others =
    selfClientId == null
      ? typing
      : typing.filter((peer) => peer.clientId !== selfClientId);
  if (others.length === 0) return null;

  return (
    <div className="vt-typing" role="status" aria-live="polite">
      <span className="vt-typing__dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span className="vt-typing__names">
        {formatNames(others.map((peer) => peer.name))}…
      </span>
    </div>
  );
}
