/**
 * Avatar generation via DiceBear (https://www.dicebear.com) — free HTTP API,
 * deterministic per seed, self-hostable. The `Avatar` component falls back to
 * colored initials whenever the remote image can't load (offline, blocked,
 * service down), so this is safe as a default.
 */

export type AvatarStyleId =
  | "notionists"
  | "adventurer"
  | "open-peeps"
  | "miniavs"
  | "lorelei"
  | "bottts"
  | "rings"
  | "shapes";

export const AVATAR_STYLES: Array<{
  id: AvatarStyleId;
  label: string;
  description: string;
}> = [
  { id: "notionists", label: "Notionists", description: "Clean line faces" },
  { id: "adventurer", label: "Adventurer", description: "D&D-inspired heroes" },
  { id: "open-peeps", label: "Open Peeps", description: "Hand-drawn doodles" },
  { id: "miniavs", label: "Mini Avatars", description: "Tiny rounded folk" },
  { id: "lorelei", label: "Lorelei", description: "Soft illustrated busts" },
  { id: "bottts", label: "Bottts", description: "Friendly robots" },
  { id: "rings", label: "Rings", description: "Minimal geometric rings" },
  { id: "shapes", label: "Shapes", description: "Abstract color blocks" },
];

export const DEFAULT_AVATAR_STYLE: AvatarStyleId = "notionists";

/** Stable avatar URL for a seed (rounded for a circular crop). */
export function avatarUrlFor(
  seed: string,
  style: AvatarStyleId = DEFAULT_AVATAR_STYLE,
): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(
    seed,
  )}&radius=50`;
}
