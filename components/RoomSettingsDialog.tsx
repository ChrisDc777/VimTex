"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MorphingModal } from "@/components/beui/motion/morphing-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/beui/motion/select";
import {
  fetchRoomMeta,
  patchRoomMeta,
  roomTtlOptions,
  type RoomMetaPublic,
  type RoomTtlPreset,
} from "@/lib/room-meta";
import { notify } from "@/lib/toasts";

type RoomSettingsPanelProps = {
  roomId: string;
  /** When false, skip fetching (panel not visible). */
  active: boolean;
  onClose: () => void;
  onBack?: () => void;
  onSaved?: (meta: RoomMetaPublic) => void;
};

/** Shared room PIN / TTL fields — used inside Morphing Modal views. */
export function RoomSettingsPanel({
  roomId,
  active,
  onClose,
  onBack,
  onSaved,
}: RoomSettingsPanelProps) {
  const [meta, setMeta] = useState<RoomMetaPublic | null>(null);
  const [password, setPassword] = useState("");
  const [ttl, setTtl] = useState<RoomTtlPreset>("never");
  const [clearPassword, setClearPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoadError(null);
    setPassword("");
    setClearPassword(false);
    setMeta(null);
    void (async () => {
      try {
        const next = await fetchRoomMeta(roomId);
        if (cancelled) return;
        setMeta(next);
        setTtl(
          next.ttlNeverAllowed === false ||
            process.env.NEXT_PUBLIC_HIDE_TTL_NEVER === "1"
            ? "30d"
            : "never",
        );
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, roomId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const patch: {
        password?: string;
        clearPassword?: boolean;
        ttl?: RoomTtlPreset;
      } = { ttl };
      if (clearPassword) {
        patch.clearPassword = true;
      } else if (password.trim()) {
        patch.password = password.trim();
      }
      const next = await patchRoomMeta(roomId, patch);
      setMeta(next);
      notify.success("Room settings saved");
      onSaved?.(next);
      onClose();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-ink">
          Room settings
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-mute hover:bg-white/[0.06]"
        >
          ×
        </button>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-mute">
        Optional PIN and absolute expiry (independent of idle GC).
      </p>

      {loadError ? (
        <p className="mb-3 text-sm text-[color:var(--error)]">{loadError}</p>
      ) : null}

      {meta?.requiresPassword ? (
        <p className="mb-2 text-xs text-mute">This room currently has a password.</p>
      ) : null}
      {meta?.expiresAt ? (
        <p className="mb-3 text-xs text-mute">
          Expires {new Date(meta.expiresAt).toLocaleString()}
          {meta.expired ? " (expired)" : ""}
        </p>
      ) : null}

      <p
        id="room-settings-ttl-label"
        className="mb-1.5 text-xs font-medium uppercase tracking-[0.04em] text-mute"
      >
        Time to live
      </p>
      <Select
        value={ttl}
        onValueChange={(v) => setTtl(v as RoomTtlPreset)}
        disabled={busy}
        className="mb-4"
      >
        <SelectTrigger
          aria-labelledby="room-settings-ttl-label"
          className="rounded-2xl border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-ink hover:border-white/20 focus-visible:ring-white/15"
        >
          <SelectValue placeholder="Choose expiry" />
        </SelectTrigger>
        <SelectContent className="border-white/[0.08] bg-[#121214] shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
          {roomTtlOptions(meta).map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="rounded-xl text-mute hover:bg-white/[0.08] hover:text-ink [[aria-selected=true]]:bg-white/[0.1] [[aria-selected=true]]:text-ink"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label
        className="mb-1.5 block text-xs font-medium uppercase tracking-[0.04em] text-mute"
        htmlFor="room-settings-password"
      >
        Set / change password
      </label>
      <input
        id="room-settings-password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (e.target.value) setClearPassword(false);
        }}
        placeholder="Leave blank to keep current"
        className="mb-3 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-mute/70 focus:border-white/20 disabled:opacity-45"
        disabled={busy || clearPassword}
      />

      {meta?.requiresPassword ? (
        <label className="mb-4 flex items-center gap-2.5 text-sm text-mute">
          <input
            type="checkbox"
            checked={clearPassword}
            onChange={(e) => {
              setClearPassword(e.target.checked);
              if (e.target.checked) setPassword("");
            }}
            disabled={busy}
            className="size-3.5 rounded border-white/20"
          />
          Remove password
        </label>
      ) : (
        <div className="mb-4" />
      )}

      <div className="flex gap-2">
        {onBack ? (
          <button
            type="button"
            className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-white/[0.06] text-sm font-medium text-ink hover:bg-white/[0.1]"
            onClick={onBack}
            disabled={busy}
          >
            Back
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-white/[0.06] text-sm font-medium text-ink hover:bg-white/[0.1]"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-ink text-sm font-medium text-[color:var(--on-primary)] disabled:opacity-45"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

type RoomSettingsDialogProps = {
  open: boolean;
  roomId: string;
  onClose: () => void;
  onSaved?: (meta: RoomMetaPublic) => void;
};

/** Standalone settings sheet (Basic / Forge / non-share entry). */
export function RoomSettingsDialog({
  open,
  roomId,
  onClose,
  onSaved,
}: RoomSettingsDialogProps) {
  return (
    <MorphingModal viewId={open ? "settings" : null} onClose={onClose}>
      <RoomSettingsPanel
        roomId={roomId}
        active={open}
        onClose={onClose}
        onSaved={onSaved}
      />
    </MorphingModal>
  );
}
