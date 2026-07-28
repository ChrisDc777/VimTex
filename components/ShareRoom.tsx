"use client";

import { useState } from "react";
import { SafeSvg } from "@/components/SafeSvg";

type ShareRoomProps = {
  roomId: string;
  /** Classic uses outline pill chrome; Quiet Craft keeps header-btn styling. */
  variant?: "classic" | "quietCraft";
};

export function ShareRoom({ roomId, variant = "quietCraft" }: ShareRoomProps) {
  const [copied, setCopied] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const roomUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);
    return url.toString();
  };

  const copyLink = async () => {
    const href = roomUrl();
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setFallbackUrl(null);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setFallbackUrl(href);
      setCopied(false);
      try {
        window.prompt("Copy this room link:", href);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void copyLink()}
        className={
          variant === "classic"
            ? copied
              ? "vt-pill vt-pill--ghost text-[color:var(--accent-breeze)]"
              : "vt-pill vt-pill--ghost"
            : copied
              ? "vt-header-btn vt-header-btn--success"
              : "vt-header-btn"
        }
        title={`Copy link for room ${roomId}`}
        aria-live="polite"
      >
        <LinkIcon />
        {copied ? "Copied" : "Share"}
      </button>
      {fallbackUrl ? (
        <input
          readOnly
          value={fallbackUrl}
          aria-label="Room URL"
          className="vt-pill vt-pill--ghost max-w-[12rem] truncate px-2 text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}

function LinkIcon() {
  return (
    <SafeSvg
      width={14}
      height={14}
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
    </SafeSvg>
  );
}
