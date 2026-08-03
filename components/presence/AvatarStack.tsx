"use client";

import { Avatar } from "@/components/presence/Avatar";
import type { PeerInfo } from "@/lib/types";

type AvatarStackProps = {
  peers: PeerInfo[];
  selfClientId?: number | null;
  /** Max visible avatars before collapsing into "+N". */
  max?: number;
  size?: number;
};

/**
 * Overlapping avatar stack (Slack/GitHub style) for compact presence in
 * headers. Overflow collapses into a "+N" bubble.
 */
export function AvatarStack({
  peers,
  selfClientId,
  max = 3,
  size = 22,
}: AvatarStackProps) {
  const others =
    selfClientId == null
      ? peers
      : peers.filter((peer) => peer.clientId !== selfClientId);
  if (others.length === 0) return null;

  const visible = others.slice(0, max);
  const overflow = others.length - visible.length;

  return (
    <div
      className="vt-avatar-stack"
      role="list"
      aria-label="People in this room"
    >
      {visible.map((peer) => (
        <span
          key={peer.clientId}
          className="vt-avatar-stack__item"
          role="listitem"
          title={peer.name}
        >
          <Avatar
            name={peer.name}
            color={peer.color}
            avatarUrl={peer.avatarUrl}
            size={size}
          />
        </span>
      ))}
      {overflow > 0 ? (
        <span
          className="vt-avatar-stack__more"
          title={`${others.length} people in this room`}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
