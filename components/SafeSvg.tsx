"use client";

import { useEffect, useState, type SVGProps } from "react";

function toNumber(value: SVGProps<SVGSVGElement>["width"], fallback: number) {
  return typeof value === "number" ? value : fallback;
}

/**
 * Renders SVG only after hydration so browser extensions (e.g. Dark Reader)
 * cannot mutate stroke attributes before React attaches.
 */
export function SafeSvg({
  children,
  width,
  height,
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const w = toNumber(width, 16);
  const h = toNumber(height, 16);

  if (!mounted) {
    return (
      <span
        aria-hidden
        className={className}
        style={{
          display: "inline-block",
          width: w,
          height: h,
          flexShrink: 0,
          verticalAlign: "middle",
        }}
      />
    );
  }

  return (
    <svg width={width ?? w} height={height ?? h} className={className} {...props}>
      {children}
    </svg>
  );
}
