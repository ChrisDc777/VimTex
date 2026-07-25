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
      className={
        copied ? "vt-header-btn vt-header-btn--success" : "vt-header-btn"
      }
      title={`Copy link for room ${roomId}`}
      aria-live="polite"
    >
      <LinkIcon />
      {copied ? "Copied" : "Share"}
    </button>
  );
}

function LinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="-1 -1 17 17"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M6.25 8.75 8.75 6.25M5.5 9.5l-1.75 1.75a2.12 2.12 0 0 1-3-3l2.5-2.5a2.12 2.12 0 0 1 3 3L6.25 8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 5.5l1.75-1.75a2.12 2.12 0 0 1 3 3l-2.5 2.5a2.12 2.12 0 0 1-3-3L8.75 6.25"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
