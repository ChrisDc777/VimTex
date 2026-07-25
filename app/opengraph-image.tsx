import { ImageResponse } from "next/og";
import { BRAND_COLORS, getBrandMonoFont } from "@/lib/brand-assets";

export const alt = "VimTex — keyboard-first Vim + LaTeX scratchpad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const font = await getBrandMonoFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_COLORS.canvas,
          fontFamily: "JetBrains Mono",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 64,
            display: "flex",
            fontSize: 28,
            color: BRAND_COLORS.mute,
            opacity: 0.35,
          }}
        >
          \documentclass{"{"}article{"}"}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 112,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          <span style={{ color: BRAND_COLORS.ink }}>Vim</span>
          <span style={{ color: BRAND_COLORS.success }}>Tex</span>
          <div
            style={{
              width: 14,
              height: 96,
              marginLeft: 6,
              background: BRAND_COLORS.success,
            }}
          />
        </div>
        <p
          style={{
            marginTop: 36,
            fontSize: 32,
            fontWeight: 600,
            color: BRAND_COLORS.body,
            letterSpacing: "-0.01em",
          }}
        >
          Keyboard-first Vim + LaTeX scratchpad
        </p>
        <p
          style={{
            marginTop: 12,
            fontSize: 24,
            color: BRAND_COLORS.mute,
          }}
        >
          Inline math · Live preview · Collab rooms
        </p>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "JetBrains Mono", data: font, style: "normal", weight: 600 }],
    },
  );
}
