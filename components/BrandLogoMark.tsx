import { SafeSvg } from "@/components/SafeSvg";

type BrandLogoMarkProps = {
  className?: string;
};

export function BrandLogoMark({ className }: BrandLogoMarkProps) {
  return (
    <SafeSvg
      className={className ? `vt-brand-mark ${className}` : "vt-brand-mark"}
      viewBox="0 0 28 20"
      width={28}
      height={20}
      aria-hidden
    >
      <path
        d="M1.5 3.5 5.75 16.5 10 3.5"
        className="vt-brand-mark__v"
        fill="none"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 3.5h9.5"
        className="vt-brand-mark__t"
        fill="none"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <path
        d="M17.75 3.5V16.5"
        className="vt-brand-mark__t"
        fill="none"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </SafeSvg>
  );
}
