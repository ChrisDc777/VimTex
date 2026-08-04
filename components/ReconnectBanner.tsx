"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { notify } from "@/lib/toasts";
import type { CollabStatus } from "@/lib/types";

type ReconnectBannerProps = {
  status: CollabStatus;
  /**
   * When true, copy mentions local buffering (Forge autosave).
   * Studio keeps edits only in the in-memory Yjs doc until reconnect.
   */
  localBuffer?: boolean;
};

export function ReconnectBanner({
  status,
  localBuffer = false,
}: ReconnectBannerProps) {
  const workspace = useWorkspace();
  const [online, setOnline] = useState(true);
  const wasConnectedRef = useRef(false);
  const lostRef = useRef(false);
  const prevStatusRef = useRef<CollabStatus | null>(null);

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

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === "connected") {
      if (wasConnectedRef.current && lostRef.current) {
        notify.success("Back online — changes synced");
      }
      wasConnectedRef.current = true;
      lostRef.current = false;
      return;
    }

    if (prev === "connected" && status === "disconnected") {
      lostRef.current = true;
    }
  }, [status]);

  const disconnected = status === "disconnected";
  const reconnecting = status === "connecting" && wasConnectedRef.current;
  if (online && !disconnected && !reconnecting) return null;

  const message = online
    ? disconnected
      ? localBuffer
        ? "Connection lost — edits keep saving locally and will resync."
        : "Connection lost — edits stay in this tab until you reconnect."
      : "Reconnecting…"
    : localBuffer
      ? "You're offline — edits keep saving locally and will resync when you're back online."
      : "You're offline — edits stay in this tab until you're back online.";

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        disconnected
          ? "vt-reconnect-banner"
          : "vt-reconnect-banner vt-reconnect-banner--reconnecting"
      }
    >
      <span className="vt-reconnect-banner__dot" aria-hidden />
      <span className="vt-reconnect-banner__text">{message}</span>
      {disconnected ? (
        <button
          type="button"
          className="vt-reconnect-banner__cta"
          onClick={() => workspace?.reconnect()}
        >
          Reconnect
        </button>
      ) : null}
    </div>
  );
}
