import { BRAND_COLORS } from "@/lib/brand-assets";

type BrandVtMarkProps = {
  fontSize: number;
  letterSpacing?: string;
};

export function BrandVtMark({ fontSize, letterSpacing = "-0.04em" }: BrandVtMarkProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontFamily: "JetBrains Mono",
        fontSize,
        fontWeight: 600,
        letterSpacing,
        lineHeight: 1,
      }}
    >
      <span style={{ color: BRAND_COLORS.ink, display: "flex" }}>V</span>
      <span style={{ color: BRAND_COLORS.success, display: "flex" }}>T</span>
    </div>
  );
}
