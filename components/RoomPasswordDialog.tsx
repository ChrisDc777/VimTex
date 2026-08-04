"use client";

import { useState, type FormEvent } from "react";

type RoomPasswordDialogProps = {
  roomId: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (password: string) => void;
};

export function RoomPasswordDialog({
  roomId,
  busy = false,
  error = null,
  onSubmit,
}: RoomPasswordDialogProps) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim() || busy) return;
    onSubmit(password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-hairline bg-[color:var(--canvas)] p-4 shadow-xl"
        aria-labelledby="room-password-title"
      >
        <h2 id="room-password-title" className="text-sm font-semibold text-ink">
          Password required
        </h2>
        <p className="mt-1 text-xs text-mute">
          Room <span className="font-mono">{roomId.slice(0, 8)}…</span> is
          locked. Enter the PIN to join.
        </p>
        <label className="mt-3 block text-xs text-mute" htmlFor="room-password">
          Password
        </label>
        <input
          id="room-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border border-hairline bg-transparent px-2 py-1.5 text-sm text-ink"
          disabled={busy}
          autoFocus
        />
        {error ? (
          <p className="mt-2 text-xs text-[color:var(--danger,#ee6352)]" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !password.trim()}
          className="vt-pill mt-3 w-full justify-center"
        >
          {busy ? "Unlocking…" : "Unlock room"}
        </button>
      </form>
    </div>
  );
}
