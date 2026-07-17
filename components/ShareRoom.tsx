"use client";

import { useState } from "react";

type ShareRoomProps = {
  roomId: string;
};

export function ShareRoom({ roomId }: ShareRoomProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: leave URL updated via history already.
    }
  };

  return (
    <button
      type="button"
      onClick={copyLink}
      className="rounded-full border border-hairline px-3 py-1 font-mono text-xs uppercase tracking-[1.2px] text-ink transition-colors hover:bg-ink hover:text-on-primary"
      title={`Room ${roomId}`}
    >
      {copied ? "Copied" : "Share"}
    </button>
  );
}
