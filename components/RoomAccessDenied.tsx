"use client";

type RoomAccessDeniedProps = {
  roomId: string;
};

/**
 * Shown when guest ACL is on but the URL has neither `edit` nor `view`.
 * Avoids WebsocketProvider reconnect storms after stripping capability params.
 */
export function RoomAccessDenied({ roomId }: RoomAccessDeniedProps) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2 px-4 text-center text-ink">
      <p className="vt-brand">VimTex</p>
      <h1 className="text-lg font-semibold">Share link required</h1>
      <p className="max-w-sm text-sm text-mute">
        This room uses guest capabilities. Open an{" "}
        <span className="font-mono text-ink">edit</span> or{" "}
        <span className="font-mono text-ink">view</span> link from the host —
        the room id alone is not enough.
      </p>
      <p className="mt-2 font-mono text-xs text-mute">{roomId}</p>
      <button
        type="button"
        className="vt-btn mt-4"
        onClick={() => {
          // Full load so Studio/Forge remount on a clean `/` (new room + edit).
          window.location.assign("/");
        }}
      >
        Start a new room
      </button>
    </div>
  );
}
