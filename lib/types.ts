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

export type UiVariant = "classic" | "quietCraft";
