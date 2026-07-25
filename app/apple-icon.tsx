import { ImageResponse } from "next/og";
import { BRAND_COLORS, getBrandMonoFont } from "@/lib/brand-assets";
import { BrandVtMark } from "@/lib/brand-vt-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const font = await getBrandMonoFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_COLORS.canvas,
        }}
      >
        <BrandVtMark fontSize={88} />
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "JetBrains Mono", data: font, style: "normal", weight: 600 }],
    },
  );
}
