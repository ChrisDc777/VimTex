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
};

export type UiVariant = "studio" | "forge";

/** What to open when starting a new sheet / joining a room. */
export type NewRoomOptions = {
  /** Seed a fresh room with this template id (see lib/templates). */
  templateId?: string;
  /** Join this existing room id instead of generating a new one. */
  roomId?: string;
};
