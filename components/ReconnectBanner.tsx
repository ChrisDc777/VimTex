"use client";

import { useEffect, useState } from "react";
import type { CollabStatus } from "@/lib/types";

type ReconnectBannerProps = {
  status: CollabStatus;
};

export function ReconnectBanner({ status }: ReconnectBannerProps) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Show when the browser reports offline (transport may not have dropped yet)
  // or when the Yjs provider is disconnected.
  if (online && status !== "disconnected") return null;

  return (
    <div role="status" aria-live="polite" className="vt-reconnect-banner">
      <span className="vt-reconnect-banner__dot" aria-hidden />
      <span>
        You are offline — edits still save locally and will resync when you
        reconnect.
      </span>
    </div>
  );
}
