"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  fetchRoomMeta,
  patchRoomMeta,
  type RoomMetaPublic,
  type RoomTtlPreset,
  ROOM_TTL_OPTIONS,
} from "@/lib/room-meta";
import { notify } from "@/lib/toasts";

type RoomSettingsDialogProps = {
  open: boolean;
  roomId: string;
  onClose: () => void;
  /** Called after a successful PATCH so the parent can refresh gate state. */
  onSaved?: (meta: RoomMetaPublic) => void;
};

export function RoomSettingsDialog({
  open,
  roomId,
  onClose,
  onSaved,
}: RoomSettingsDialogProps) {
  const [meta, setMeta] = useState<RoomMetaPublic | null>(null);
  const [password, setPassword] = useState("");
  const [ttl, setTtl] = useState<RoomTtlPreset>("never");
  const [clearPassword, setClearPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadError(null);
    setPassword("");
    setClearPassword(false);
    void (async () => {
      try {
        const next = await fetchRoomMeta(roomId);
        if (cancelled) return;
        setMeta(next);
        setTtl("never");
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, roomId]);

  if (!open) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-md rounded-lg border border-hairline bg-[color:var(--canvas)] p-4 shadow-xl"
        aria-labelledby="room-settings-title"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id="room-settings-title" className="text-sm font-semibold text-ink">
            Room settings
          </h2>
          <button
            type="button"
            className="vt-chat-icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p className="mt-1 text-xs text-mute">
          Optional PIN and absolute expiry (independent of idle GC).
        </p>

        {loadError ? (
          <p className="mt-3 text-xs text-[color:var(--danger,#ee6352)]">{loadError}</p>
        ) : null}

        {meta?.requiresPassword ? (
          <p className="mt-3 text-xs text-mute">This room currently has a password.</p>
        ) : null}
        {meta?.expiresAt ? (
          <p className="mt-1 text-xs text-mute">
            Expires {new Date(meta.expiresAt).toLocaleString()}
            {meta.expired ? " (expired)" : ""}
          </p>
        ) : null}

        <label className="mt-3 block text-xs text-mute" htmlFor="room-settings-ttl">
          Time to live
        </label>
        <select
          id="room-settings-ttl"
          value={ttl}
          onChange={(e) => setTtl(e.target.value as RoomTtlPreset)}
          className="mt-1 w-full rounded border border-hairline bg-transparent px-2 py-1.5 text-sm text-ink"
          disabled={busy}
        >
          {ROOM_TTL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs text-mute" htmlFor="room-settings-password">
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
          className="mt-1 w-full rounded border border-hairline bg-transparent px-2 py-1.5 text-sm text-ink"
          disabled={busy || clearPassword}
        />

        {meta?.requiresPassword ? (
          <label className="mt-2 flex items-center gap-2 text-xs text-mute">
            <input
              type="checkbox"
              checked={clearPassword}
              onChange={(e) => {
                setClearPassword(e.target.checked);
                if (e.target.checked) setPassword("");
              }}
              disabled={busy}
            />
            Remove password
          </label>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="vt-pill vt-pill--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="vt-pill" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
