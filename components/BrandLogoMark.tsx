type BrandLogoMarkProps = {
  className?: string;
};

export function BrandLogoMark({ className }: BrandLogoMarkProps) {
  return (
    <svg
      className={className ? `vt-brand-mark ${className}` : "vt-brand-mark"}
      viewBox="0 0 28 20"
      width="28"
      height="20"
      aria-hidden="true"
    >
      <text x="0" y="16" className="vt-brand-mark__v">
        V
      </text>
      <text x="11" y="16" className="vt-brand-mark__t">
        T
      </text>
    </svg>
  );
}
