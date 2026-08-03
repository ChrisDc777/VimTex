"use client";

import { Avatar } from "@/components/presence/Avatar";
import type { PeerInfo } from "@/lib/types";

type PeerChipsProps = {
  peers: PeerInfo[];
  selfClientId?: number | null;
  /** Max visible chips before collapsing into "+N". */
  max?: number;
  size?: number;
  className?: string;
};

/**
 * Row of name chips (avatar + name) for everyone else in the room. Names
 * collapse to avatars on small screens via CSS; overflow becomes "+N".
 */
export function PeerChips({
  peers,
  selfClientId,
  max = 3,
  size = 18,
  className,
}: PeerChipsProps) {
  const others =
    selfClientId == null
      ? peers
      : peers.filter((peer) => peer.clientId !== selfClientId);
  if (others.length === 0) return null;

  const visible = others.slice(0, max);
  const overflow = others.length - visible.length;

  return (
    <div
      className={`vt-peers ${className ?? ""}`}
      role="list"
      aria-label="People in this room"
    >
      {visible.map((peer) => (
        <span
          key={peer.clientId}
          className="vt-peers__chip"
          role="listitem"
          title={peer.name}
        >
          <Avatar
            name={peer.name}
            color={peer.color}
            avatarUrl={peer.avatarUrl}
            size={size}
          />
          <span className="vt-peers__name">{peer.name}</span>
        </span>
      ))}
      {overflow > 0 ? (
        <span
          className="vt-peers__more"
          title={`${others.length} people in this room`}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
