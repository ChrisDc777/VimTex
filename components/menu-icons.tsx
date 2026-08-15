import { SafeSvg } from "@/components/SafeSvg";

/** Small leading icons for Sheet / Studio header menus. */
export function MenuBlankIcon() {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="vt-header-menu__icon"
    >
      <path
        d="M3.5 2.75h6.2L12.5 5.55V13.25H3.5V2.75Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 2.75V5.55H12.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}

export function MenuTemplateIcon() {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="vt-header-menu__icon"
    >
      <rect
        x="2.75"
        y="2.75"
        width="10.5"
        height="10.5"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M5 6.25h6M5 8.75h4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </SafeSvg>
  );
}

export function MenuImportIcon() {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="vt-header-menu__icon"
    >
      <path
        d="M8 2.75v7.5M5.5 7.75 8 10.25l2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.25 12.5h9.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </SafeSvg>
  );
}

export function MenuLatexIcon() {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="vt-header-menu__icon"
    >
      <path
        d="M3.5 12.5 6.2 3.5h1.2L10.1 12.5M4.6 9.4h4.2M11 12.5V6.2c0-1.2.7-1.95 1.85-1.95"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}

export function MenuMarkdownIcon() {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="vt-header-menu__icon"
    >
      <rect
        x="2.5"
        y="3.5"
        width="11"
        height="9"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M4.75 10.25V5.75L6.75 8.5 8.75 5.75v4.5M10.5 8.25 12 10.25l1.5-2"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}

export function MenuPdfIcon() {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="vt-header-menu__icon"
    >
      <path
        d="M4 2.75h5.2L12.5 6.05V13.25H4V2.75Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M9 2.75V6.05h3.3M5.75 9.5h4.5M5.75 11.5h3"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}

export function MenuCopyIcon() {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="vt-header-menu__icon"
    >
      <rect
        x="5.25"
        y="5.25"
        width="7.5"
        height="7.5"
        rx="1.1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M10.75 5.25V3.85A1.1 1.1 0 0 0 9.65 2.75H3.85A1.1 1.1 0 0 0 2.75 3.85v5.8a1.1 1.1 0 0 0 1.1 1.1h1.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}

export function MenuPrefsIcon() {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="vt-header-menu__icon"
    >
      <circle cx="8" cy="8" r="2.15" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 2.6v1.3M8 12.1v1.3M2.6 8h1.3M12.1 8h1.3M4.05 4.05l.92.92M11.03 11.03l.92.92M11.95 4.05l-.92.92M4.97 11.03l-.92.92"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </SafeSvg>
  );
}

export function MenuSettingsIcon() {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="vt-header-menu__icon"
    >
      <path
        d="M6.4 2.85h3.2l.45 1.35 1.4.55 1.35-.5 1.6 2.75-1 1.05v1.5l1 1.05-1.6 2.75-1.35-.5-1.4.55-.45 1.35H6.4l-.45-1.35-1.4-.55-1.35.5L1.6 10.4l1-1.05v-1.5l-1-1.05L3.2 4.05l1.35.5 1.4-.55.45-1.15Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.85" stroke="currentColor" strokeWidth="1.1" />
    </SafeSvg>
  );
}

export function MenuLinkIcon() {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="vt-header-menu__icon"
    >
      <path
        d="M6.25 8.75 8.75 6.25M5.5 9.5l-1.75 1.75a2.12 2.12 0 0 1-3-3l2.5-2.5a2.12 2.12 0 0 1 3 3L6.25 8"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 5.5l1.75-1.75a2.12 2.12 0 0 1 3 3l-2.5 2.5a2.12 2.12 0 0 1-3-3L8.75 6.25"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}

export function MenuViewLinkIcon() {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="vt-header-menu__icon"
    >
      <path
        d="M2.75 8s2.1-3.5 5.25-3.5S13.25 8 13.25 8s-2.1 3.5-5.25 3.5S2.75 8 2.75 8Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.6" stroke="currentColor" strokeWidth="1.15" />
    </SafeSvg>
  );
}
