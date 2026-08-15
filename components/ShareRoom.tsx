"use client";

import { useEffect, useRef, useState } from "react";
import { SafeSvg } from "@/components/SafeSvg";
import {
  MenuLinkIcon,
  MenuSettingsIcon,
  MenuViewLinkIcon,
} from "@/components/menu-icons";
import {
  buildRoomUrl,
  ensureRoomCapabilities,
  resolveEditSecret,
} from "@/lib/room-auth";
import { writeRoomToLocation } from "@/lib/collab";
import { notify } from "@/lib/toasts";

type ShareRoomProps = {
  roomId: string;
  /** Studio uses outline pill chrome; Forge keeps header-btn styling. */
  variant?: "studio" | "forge";
  /** Hide view-link minting when already viewing read-only. */
  readOnly?: boolean;
  /** Open room password / TTL settings. */
  onOpenSettings?: () => void;
  /**
   * Called after Share upgrades/returns an edit secret so the shell can
   * reconnect WS with `edit` (and keep the URL in sync).
   */
  onEditSecret?: (edit: string) => void;
};

export function ShareRoom({
  roomId,
  variant = "forge",
  readOnly = false,
  onOpenSettings,
  onEditSecret,
}: ShareRoomProps) {
  const [copied, setCopied] = useState<"edit" | "view" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null,
  );
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      // Fixed menu is portaled visually but still under rootRef if we keep it inside.
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onReposition = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      setMenuPos({
        top: r.bottom + 4,
        right: Math.max(8, window.innerWidth - r.right),
      });
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [menuOpen]);

  const openMenu = () => {
    const btn = buttonRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      setMenuPos({
        top: r.bottom + 4,
        right: Math.max(8, window.innerWidth - r.right),
      });
    }
    setMenuOpen(true);
  };

  const copyHref = async (href: string, kind: "edit" | "view") => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(kind);
      setFallbackUrl(null);
      notify.success(
        kind === "view" ? "View-only link copied" : "Edit link copied",
      );
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setFallbackUrl(href);
      setCopied(null);
      try {
        window.prompt("Copy this room link:", href);
      } catch {
        // ignore
      }
    }
  };

  const ensureEdit = async (includeViewToken: boolean) => {
    const caps = await ensureRoomCapabilities(roomId, {
      edit: resolveEditSecret(roomId),
      includeViewToken,
    });
    onEditSecret?.(caps.edit);
    writeRoomToLocation(roomId, { editSecret: caps.edit, clearViewToken: true });
    return caps;
  };

  const copyEditLink = async () => {
    setMenuOpen(false);
    setBusy(true);
    try {
      const caps = await ensureEdit(false);
      await copyHref(
        buildRoomUrl(roomId, { editSecret: caps.edit }),
        "edit",
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Could not mint link";
      notify.error(detail);
    } finally {
      setBusy(false);
    }
  };

  const copyViewLink = async () => {
    setMenuOpen(false);
    setBusy(true);
    try {
      const caps = await ensureEdit(true);
      const viewToken = caps.viewToken;
      if (!viewToken) throw new Error("View token missing");
      // Keep this tab as editor (edit in URL/session); shared clipboard link is view-only.
      await copyHref(buildRoomUrl(roomId, { viewToken }), "view");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Could not mint link";
      notify.error(detail);
    } finally {
      setBusy(false);
    }
  };

  const studioBtn = (active: boolean) =>
    active
      ? "vt-pill vt-pill--ghost vt-pill--icon text-[color:var(--accent-breeze)]"
      : "vt-pill vt-pill--ghost vt-pill--icon";

  const forgeBtn = (active: boolean) =>
    active ? "vt-header-btn vt-header-btn--success" : "vt-header-btn";

  if (readOnly) {
    return (
      <div className="relative flex items-center gap-1.5">
        <span
          className={
            variant === "studio"
              ? "vt-pill vt-pill--ghost text-xs text-mute"
              : "vt-caption text-mute"
          }
          title="You opened a view-only link"
        >
          View only
        </span>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative flex items-center gap-1.5">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (menuOpen) setMenuOpen(false);
          else openMenu();
        }}
        className={
          variant === "studio"
            ? studioBtn(copied != null)
            : forgeBtn(copied != null)
        }
        title={
          copied
            ? "Link copied"
            : `Share room ${roomId} (edit or view-only)`
        }
        aria-label={
          variant === "studio"
            ? copied
              ? "Link copied"
              : "Share room"
            : undefined
        }
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-live="polite"
        disabled={busy}
      >
        {copied ? <CheckIcon /> : <LinkIcon />}
        {variant === "studio" ? null : copied ? "Copied" : "Share"}
      </button>
      {menuOpen && menuPos ? (
        <div
          role="menu"
          className="fixed z-[200] min-w-[11rem] rounded-md border border-hairline bg-[color:var(--canvas)] py-1 shadow-lg"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <button
            type="button"
            role="menuitem"
            className="vt-share-menu__item"
            onClick={() => void copyEditLink()}
          >
            <MenuLinkIcon />
            Copy edit link
          </button>
          <button
            type="button"
            role="menuitem"
            className="vt-share-menu__item"
            onClick={() => void copyViewLink()}
            disabled={busy}
          >
            <MenuViewLinkIcon />
            Copy view-only link
          </button>
          {onOpenSettings ? (
            <button
              type="button"
              role="menuitem"
              className="vt-share-menu__item"
              onClick={() => {
                setMenuOpen(false);
                onOpenSettings();
              }}
            >
              <MenuSettingsIcon />
              Room settings…
            </button>
          ) : null}
        </div>
      ) : null}
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

function CheckIcon() {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M3.5 8.25 6.5 11.25 12.5 4.75"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SafeSvg>
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
