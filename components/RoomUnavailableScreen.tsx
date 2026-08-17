"use client";

type RoomUnavailableScreenProps = {
  roomId?: string | null;
  message?: string | null;
  onRetry?: () => void;
};

/**
 * Shown when room metadata cannot be loaded. Never present this as a blank
 * new room — that would look like data loss.
 */
export function RoomUnavailableScreen({
  roomId,
  message,
  onRetry,
}: RoomUnavailableScreenProps) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2 px-4 text-center text-ink">
      <p className="vt-brand">VimTex</p>
      <h1 className="text-lg font-semibold">Room service unavailable</h1>
      <p className="max-w-sm text-sm text-mute">
        {message?.trim() ||
          "Could not load this room. Check your connection, then retry. If this keeps happening, export a local copy from another tab if you have one."}
      </p>
      {roomId ? (
        <p className="mt-2 font-mono text-xs text-mute">{roomId}</p>
      ) : null}
      {onRetry ? (
        <button type="button" className="vt-btn mt-4" onClick={onRetry}>
          Retry
        </button>
      ) : null}
      <button
        type="button"
        className="vt-btn mt-2"
        onClick={() => {
          window.location.assign("/");
        }}
      >
        Start a new room
      </button>
    </div>
  );
}
