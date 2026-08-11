import { SafeSvg } from "@/components/SafeSvg";

export function CloseIcon() {
  return (
    <SafeSvg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </SafeSvg>
  );
}

export function SendIcon() {
  return (
    <SafeSvg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 12.5V3.5M8 3.5 4.5 7M8 3.5l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}

export function RefreshIcon() {
  return (
    <SafeSvg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M11.5 7A4.5 4.5 0 0 1 3.6 9.1M2.5 7A4.5 4.5 0 0 1 10.4 4.9M2.5 4.5V7H5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}

export function StopIcon() {
  return (
    <SafeSvg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect
        x="3.25"
        y="3.25"
        width="7.5"
        height="7.5"
        rx="1"
        fill="currentColor"
      />
    </SafeSvg>
  );
}

export function ChevronIcon({ className }: { className?: string }) {
  return (
    <SafeSvg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}

export function ReplyIcon({ className }: { className?: string }) {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M5.5 4.5 2.5 7.5 5.5 10.5M2.75 7.5H8.5a3 3 0 0 1 3 3V11"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}

export function CopyIcon({ className }: { className?: string }) {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect
        x="4.5"
        y="4.5"
        width="7"
        height="7"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M9.5 4.5V3.75A1.25 1.25 0 0 0 8.25 2.5H3.75A1.25 1.25 0 0 0 2.5 3.75v4.5A1.25 1.25 0 0 0 3.75 9.5H4.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </SafeSvg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M3.5 7.25 5.75 9.5 10.5 4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}
