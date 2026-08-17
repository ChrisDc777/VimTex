/**
 * Frozen room HTTP + WebSocket contracts shared by Node and Cloudflare.
 * Keep paths, JSON shapes, headers, Yjs keys, and WS message types stable.
 */

export const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;
export const SNAP_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;

export const YJS_TEXT_KEY = "codemirror";
export const YJS_CHAT_KEY = "chat";

export const WS_MESSAGE_SYNC = 0;
export const WS_MESSAGE_AWARENESS = 1;

export const ROOM_HEADERS = {
  edit: "x-vimtex-edit",
  view: "x-vimtex-view",
  auth: "x-vimtex-auth",
} as const;

export const CAPABILITY_QUERY_KEYS = {
  edit: "edit",
  view: "view",
  auth: "auth",
} as const;

export const AWARENESS_FIELDS = ["user", "typing"] as const;

export const ROOM_TTL_PRESETS = [
  "never",
  "1h",
  "24h",
  "7d",
  "30d",
] as const;

export type RoomTtlPreset = (typeof ROOM_TTL_PRESETS)[number];

/** Public-beta Cloudflare rooms reject "never" and default to 30 days. */
export const PUBLIC_BETA_DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const MAX_UNPINNED_SNAPSHOTS = 50;
export const MAX_SNAPSHOTS_HARD_CAP = 100;

/** Stay under SQLite's ~2 MiB row limit with headroom. */
export const MAX_YJS_STATE_BYTES = 1_500_000;
export const MAX_SNAPSHOT_BYTES = 1_500_000;

export function isValidRoomId(id: string): boolean {
  return ROOM_ID_PATTERN.test(id);
}

export function isValidSnapId(id: string): boolean {
  return SNAP_ID_PATTERN.test(id);
}

export function roomApiPath(roomId: string, suffix: string): string {
  return `/api/rooms/${encodeURIComponent(roomId)}${suffix}`;
}

export const ROOM_HTTP_PATHS = {
  meta: "/meta",
  unlock: "/unlock",
  capabilities: "/capabilities",
  viewToken: "/view-token",
  snapshots: "/snapshots",
} as const;

export type RoomMetaPublic = {
  roomId: string;
  requiresPassword: boolean;
  hasEditAcl?: boolean;
  expiresAt: number | null;
  expired: boolean;
  createdAt?: number | null;
  ttlNeverAllowed?: boolean;
};

export type RoomCapabilitiesResponse = {
  roomId: string;
  edit: string;
  hasEditAcl: true;
  upgraded: boolean;
  viewToken?: string;
};

export type RoomUnlockResponse = {
  authToken: string;
};

export type SnapshotKind =
  | "manual"
  | "pre_ai"
  | "pre_restore"
  | "auto_idle"
  | "auto_interval"
  | "named";

export type RoomSnapshotMeta = {
  id: string;
  roomId: string;
  label: string;
  createdAt: number;
  byteLength: number;
  kind?: SnapshotKind;
  contentHash?: string;
  charLength?: number;
  createdBy?: { name?: string; clientId?: number };
  pinned?: boolean;
};

export type ForkSnapshotResponse = {
  roomId: string;
  edit: string;
  snapshot: { id: string; label: string };
  sourceSnapId: string;
  charLength: number;
};

export type RestoreSnapshotResponse = {
  ok: true;
  text: string;
  length: number;
  /** Server applied the restore to the live Y.Doc and broadcast it. */
  applied: boolean;
};
