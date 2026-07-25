import { ImageResponse } from "next/og";
import { BRAND_COLORS, getBrandMonoFont } from "@/lib/brand-assets";
import { BrandVtMark } from "@/lib/brand-vt-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
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
        <BrandVtMark fontSize={18} />
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "JetBrains Mono", data: font, style: "normal", weight: 600 }],
    },
  );
}
