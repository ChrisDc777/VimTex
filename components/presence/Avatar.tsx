"use client";

import { useState, type CSSProperties } from "react";

type AvatarProps = {
  name: string;
  color: string;
  /** Optional remote image (e.g. DiceBear); falls back to initials. */
  avatarUrl?: string | null;
  size?: number;
  className?: string;
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Circular presence avatar: the peer's caret color with dark initials, or a
 * remote image when `avatarUrl` is set. Size is set via --vt-avatar-size so
 * layouts can reuse the same component at any scale.
 */
export function Avatar({
  name,
  color,
  avatarUrl,
  size = 20,
  className,
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const style = { "--vt-avatar-size": `${size}px` } as CSSProperties;

  if (avatarUrl && !imageFailed) {
    return (
      <span className={`vt-avatar ${className ?? ""}`} style={style} title={name}>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote avatar URL, dynamic size; not optimizable by next/image */}
        <img
          className="vt-avatar__img"
          src={avatarUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`vt-avatar ${className ?? ""}`}
      style={{ ...style, backgroundColor: color }}
      title={name}
      aria-hidden
    >
      <span className="vt-avatar__initials">{initialsFor(name)}</span>
    </span>
  );
}
