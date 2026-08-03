export type ViewMode = "realtime" | "split";
export type VimMode = string;

export type CollabStatus =
  | "local"
  | "connecting"
  | "connected"
  | "disconnected";

export type CollabUser = {
  name: string;
  color: string;
  /** Semi-transparent selection fill for remote peers (y-codemirror.next). */
  colorLight: string;
  /** Optional remote avatar image (e.g. DiceBear URL); initials fallback. */
  avatarUrl?: string | null;
};

/**
 * Live view of one collaborator in the room (including the local user).
 * Derived from Yjs awareness; `typing` is considered stale after a timeout.
 */
export type PeerInfo = {
  clientId: number;
  name: string;
  color: string;
  colorLight: string;
  avatarUrl?: string | null;
  lastSeen: number;
  typing: boolean;
};

export type UiVariant = "studio" | "forge";

/** What to open when starting a new sheet / joining a room. */
export type NewRoomOptions = {
  /** Seed a fresh room with this template id (see lib/templates). */
  templateId?: string;
  /** Join this existing room id instead of generating a new one. */
  roomId?: string;
};
