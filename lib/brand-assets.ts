export const BRAND_COLORS = {
  canvas: "#111214",
  ink: "#e8eaed",
  body: "#b4b8be",
  mute: "#6e737a",
  success: "#6dba82",
} as const;

let monoFontCache: ArrayBuffer | null = null;

export async function getBrandMonoFont(): Promise<ArrayBuffer> {
  if (monoFontCache) return monoFontCache;

  const res = await fetch(
    "https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-600-normal.ttf",
  );
  if (!res.ok) {
    throw new Error("Failed to load brand mono font");
  }

  monoFontCache = await res.arrayBuffer();
  return monoFontCache;
}
