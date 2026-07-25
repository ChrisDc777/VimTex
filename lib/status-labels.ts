import type { CollabStatus, VimMode } from "@/lib/types";

export function formatVimMode(mode: VimMode): string {
  const m = mode.toLowerCase();
  if (m.startsWith("vis")) return "Visual";
  if (m.startsWith("ins")) return "Insert";
  if (m.startsWith("rep")) return "Replace";
  if (m.startsWith("nor") || m === "normal") return "Normal";
  return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
}

export function abbreviateVimMode(mode: VimMode): string {
  const m = mode.toLowerCase();
  if (m.startsWith("vis")) return "V";
  if (m.startsWith("ins")) return "I";
  if (m.startsWith("rep")) return "R";
  if (m.startsWith("nor") || m === "normal") return "N";
  return mode.charAt(0).toUpperCase();
}

export function formatCollabStatus(status: CollabStatus): string {
  if (status === "local") return "Local";
  if (status === "connected") return "Connected";
  if (status === "disconnected") return "Offline";
  return "Connecting…";
}

export function formatPeerCount(count: number): string {
  return count === 1 ? "1 peer" : `${count} peers`;
}

export function statusDotClass(status: CollabStatus): string {
  if (status === "local") return "vt-status-dot vt-status-dot--local";
  if (status === "connected") return "vt-status-dot vt-status-dot--connected";
  if (status === "disconnected") return "vt-status-dot vt-status-dot--error";
  return "vt-status-dot vt-status-dot--connecting";
}
