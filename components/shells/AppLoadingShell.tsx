"use client";

/** Shared first-paint shell so SSR HTML and the client loading state match. */
export function AppLoadingShell() {
  return (
    <div
      className="app-shell flex h-dvh items-center justify-center text-sm text-mute"
      suppressHydrationWarning
    >
      Loading VimTex…
    </div>
  );
}
