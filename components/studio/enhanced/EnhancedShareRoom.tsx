"use client";

import { useCallback, useState } from "react";
import {
  Check,
  Eye,
  Link2,
  type LucideIcon,
  Settings2,
  SquarePen,
} from "lucide-react";
import { DockItem } from "@/components/beui/motion/dock";
import { MorphingModal } from "@/components/beui/motion/morphing-modal";
import { RoomSettingsPanel } from "@/components/RoomSettingsDialog";
import {
  buildRoomUrl,
  ensureRoomCapabilities,
  resolveEditSecret,
} from "@/lib/room-auth";
import { writeRoomToLocation } from "@/lib/collab";
import type { RoomMetaPublic } from "@/lib/room-meta";
import { notify } from "@/lib/toasts";

type ShareView = "options" | "link" | "settings" | null;

type EnhancedShareRoomProps = {
  roomId: string;
  disabled?: boolean;
  onEditSecret?: (edit: string) => void;
  onSavedSettings?: (meta: RoomMetaPublic) => void;
};

/**
 * Studio Enhanced Share — bottom Morphing Modal (beUI) from the dock.
 * Forge / Basic keep classic `ShareRoom` in the topbar.
 */
export function EnhancedShareRoom({
  roomId,
  disabled = false,
  onEditSecret,
  onSavedSettings,
}: EnhancedShareRoomProps) {
  const [copied, setCopied] = useState<"edit" | "view" | null>(null);
  const [view, setView] = useState<ShareView>(null);
  const [linkKind, setLinkKind] = useState<"edit" | "view">("edit");
  const [linkHref, setLinkHref] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => setView(null), []);

  const copyHref = async (href: string, kind: "edit" | "view") => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(kind);
      setFallbackUrl(null);
      notify.success(
        kind === "view" ? "View-only link copied" : "Edit link copied",
      );
      window.setTimeout(() => setCopied(null), 1500);
      return true;
    } catch {
      setFallbackUrl(href);
      setCopied(null);
      try {
        window.prompt("Copy this room link:", href);
      } catch {
        // ignore
      }
      return false;
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

  const openEditLink = async () => {
    setBusy(true);
    try {
      const caps = await ensureEdit(false);
      const href = buildRoomUrl(roomId, { editSecret: caps.edit });
      setLinkKind("edit");
      setLinkHref(href);
      setView("link");
      await copyHref(href, "edit");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Could not mint link";
      notify.error(detail);
    } finally {
      setBusy(false);
    }
  };

  const openViewLink = async () => {
    setBusy(true);
    try {
      const caps = await ensureEdit(true);
      const viewToken = caps.viewToken;
      if (!viewToken) throw new Error("View token missing");
      const href = buildRoomUrl(roomId, { viewToken });
      setLinkKind("view");
      setLinkHref(href);
      setView("link");
      await copyHref(href, "view");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Could not mint link";
      notify.error(detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative inline-flex">
      <DockItem
        active={view != null || copied != null}
        disabled={disabled || busy}
        aria-label={copied ? "Link copied" : "Share room"}
        aria-expanded={view != null}
        tooltip={
          copied ? "Link copied" : view != null ? "Close share" : "Share room"
        }
        onClick={() => setView((v) => (v != null ? null : "options"))}
      >
        {copied ? (
          <Check className="size-4" aria-hidden strokeWidth={1.75} />
        ) : (
          <Link2 className="size-4" aria-hidden strokeWidth={1.75} />
        )}
      </DockItem>

      <MorphingModal viewId={view} onClose={close} placement="bottom">
        {view === "options" ? (
          <ShareOptions
            busy={busy}
            onClose={close}
            onCopyEdit={() => void openEditLink()}
            onCopyView={() => void openViewLink()}
            onOpenSettings={() => setView("settings")}
          />
        ) : view === "link" && linkHref ? (
          <ShareLinkReady
            kind={linkKind}
            href={linkHref}
            onBack={() => setView("options")}
            onDone={close}
            onCopyAgain={() => void copyHref(linkHref, linkKind)}
          />
        ) : view === "settings" ? (
          <RoomSettingsPanel
            roomId={roomId}
            active={view === "settings"}
            onClose={close}
            onBack={() => setView("options")}
            onSaved={onSavedSettings}
          />
        ) : null}
      </MorphingModal>

      {fallbackUrl ? (
        <input
          readOnly
          value={fallbackUrl}
          aria-label="Room URL"
          className="sr-only"
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}

function ShareOptions({
  busy,
  onClose,
  onCopyEdit,
  onCopyView,
  onOpenSettings,
}: {
  busy: boolean;
  onClose: () => void;
  onCopyEdit: () => void;
  onCopyView: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div>
      <ShareHeader title="Share room" onClose={onClose} />
      <div className="flex flex-col gap-2">
        <ShareRow
          icon={SquarePen}
          label="Copy edit link"
          disabled={busy}
          onClick={onCopyEdit}
        />
        <ShareRow
          icon={Eye}
          label="Copy view-only link"
          disabled={busy}
          onClick={onCopyView}
        />
        <ShareRow
          icon={Settings2}
          label="Room settings…"
          disabled={busy}
          onClick={onOpenSettings}
        />
      </div>
    </div>
  );
}

function ShareLinkReady({
  kind,
  href,
  onBack,
  onDone,
  onCopyAgain,
}: {
  kind: "edit" | "view";
  href: string;
  onBack: () => void;
  onDone: () => void;
  onCopyAgain: () => void;
}) {
  return (
    <div>
      <ShareHeader
        title={kind === "view" ? "View-only link" : "Edit link"}
        onClose={onDone}
      />
      <p className="mb-3 text-sm leading-relaxed text-mute">
        {kind === "view"
          ? "Anyone with this link can view the note."
          : "Anyone with this link can edit the note."}
      </p>
      <input
        readOnly
        value={href}
        aria-label={kind === "view" ? "View-only room URL" : "Edit room URL"}
        className="mb-4 w-full truncate rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 font-mono text-xs text-ink outline-none focus:border-white/20"
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-white/[0.06] text-sm font-medium text-ink hover:bg-white/[0.1]"
          onClick={onBack}
        >
          Back
        </button>
        <button
          type="button"
          className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-ink text-sm font-medium text-[color:var(--on-primary)]"
          onClick={onCopyAgain}
        >
          Copy again
        </button>
      </div>
    </div>
  );
}

function ShareHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-mute hover:bg-white/[0.06]"
      >
        ×
      </button>
    </div>
  );
}

function ShareRow({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.045] px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-ink">
        <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      </span>
      {label}
    </button>
  );
}
