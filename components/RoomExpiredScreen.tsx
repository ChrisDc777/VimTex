"use client";

type RoomExpiredBannerProps = {
  expiresAt?: number | null;
};

export function RoomExpiredScreen({ expiresAt }: RoomExpiredBannerProps) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2 px-4 text-center text-ink">
      <p className="vt-brand">VimTex</p>
      <h1 className="text-lg font-semibold">This room has expired</h1>
      <p className="max-w-sm text-sm text-mute">
        Absolute TTL ended
        {expiresAt ? ` at ${new Date(expiresAt).toLocaleString()}` : ""}. Create
        a new room from the home page to continue.
      </p>
    </div>
  );
}
