import { avatarUrlFor } from "./avatars";
import type { CollabUser } from "./types";

const NAMES = [
  "Axion",
  "Boson",
  "Quark",
  "Photon",
  "Neutrino",
  "Pulsar",
  "Nebula",
  "Orbit",
  "Vector",
  "Sigma",
];

/**
 * Distinct caret hues readable on #0a0a0a — warm / cool / neon accents,
 * spaced around the wheel so remote peers stay visually separable.
 */
const COLORS: Array<{ color: string; colorLight: string }> = [
  { color: "#ff7a17", colorLight: "#ff7a1733" }, // sunset orange
  { color: "#30bced", colorLight: "#30bced33" }, // cyan
  { color: "#6eeb83", colorLight: "#6eeb8333" }, // green
  { color: "#ffbc42", colorLight: "#ffbc4233" }, // amber
  { color: "#ee6352", colorLight: "#ee635233" }, // coral
  { color: "#a0c3ec", colorLight: "#a0c3ec33" }, // breeze blue
  { color: "#c4b5fd", colorLight: "#c4b5fd33" }, // twilight
  { color: "#1be7ff", colorLight: "#1be7ff33" }, // electric cyan
  { color: "#f472b6", colorLight: "#f472b633" }, // pink
  { color: "#84cc16", colorLight: "#84cc1633" }, // lime
];

const DISPLAY_NAME_KEY = "vimtex:displayName";
const USER_COLOR_KEY = "vimtex:userColorIndex";
const AVATAR_SEED_KEY = "vimtex:avatarSeed";

/**
 * Stable per-device avatar seed, so a peer gets a consistent random DiceBear
 * face across sessions until they pick one explicitly (future feature).
 */
function getOrCreateAvatarSeed(): string {
  if (typeof window !== "undefined") {
    try {
      const existing = localStorage.getItem(AVATAR_SEED_KEY);
      if (existing) return existing;
    } catch {
      // ignore
    }
  }
  const seed =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Math.random());
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(AVATAR_SEED_KEY, seed);
    } catch {
      // ignore
    }
  }
  return seed;
}

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** 16 hex chars = 64 bits of entropy. Not a secret — share links remain capabilities without ACL. */
export function createRoomId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function pickColor(seed: string): { color: string; colorLight: string } {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(USER_COLOR_KEY);
      if (stored != null) {
        const idx = Number.parseInt(stored, 10);
        if (Number.isFinite(idx) && idx >= 0) {
          return COLORS[idx % COLORS.length]!;
        }
      }
    } catch {
      // ignore
    }
  }
  const idx = hash(seed) % COLORS.length;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(USER_COLOR_KEY, String(idx));
    } catch {
      // ignore
    }
  }
  return COLORS[idx]!;
}

export function loadDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const name = localStorage.getItem(DISPLAY_NAME_KEY)?.trim();
    return name || null;
  } catch {
    return null;
  }
}

export function saveDisplayName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, name.trim());
  } catch {
    // ignore
  }
}

export function createCollabUser(opts?: {
  seed?: string;
  name?: string;
}): CollabUser {
  const id =
    opts?.seed ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Math.random()));
  const h = hash(id);
  const palette = pickColor(id);
  const name = opts?.name?.trim() || NAMES[h % NAMES.length]!;
  return {
    name,
    color: palette.color,
    colorLight: palette.colorLight,
    avatarUrl: avatarUrlFor(getOrCreateAvatarSeed()),
  };
}

/** WebsocketProvider server base (no trailing slash, no room segment). */
export function getCollabWsBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_COLLAB_WS_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (typeof window === "undefined") {
    return "ws://localhost:3001";
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}

export function readRoomFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room")?.trim();
  return room || null;
}

export function writeRoomToLocation(
  room: string,
  opts?: {
    clearViewToken?: boolean;
    clearEditSecret?: boolean;
    editSecret?: string | null;
    viewToken?: string | null;
  },
): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("room", room);
  url.searchParams.delete("view");
  url.searchParams.delete("edit");
  const hash = new URLSearchParams(
    url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
  );
  if (opts?.clearViewToken) {
    hash.delete("view");
  }
  if (opts?.clearEditSecret) {
    hash.delete("edit");
  } else if (opts?.editSecret) {
    hash.set("edit", opts.editSecret);
    hash.delete("view");
  }
  if (opts?.viewToken) {
    hash.set("view", opts.viewToken);
    hash.delete("edit");
  }
  url.hash = hash.toString();
  window.history.replaceState({}, "", url.toString());
}
