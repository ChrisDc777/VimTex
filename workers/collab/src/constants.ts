export const MAX_CONNECTIONS = 32;
export const MAX_MESSAGE_BYTES = 1_000_000;
export const MAX_YJS_STATE_BYTES = 1_500_000;
export const MAX_SNAPSHOT_BYTES = 1_500_000;
export const MAX_UNPINNED_SNAPSHOTS = 50;
export const MAX_SNAPSHOTS_HARD_CAP = 100;
export const PERSIST_DEBOUNCE_MS = 2_000;
export const PERSIST_MAX_WAIT_MS = 10_000;
export const MESSAGE_RATE_WINDOW_MS = 2_000;
export const MESSAGE_RATE_MAX = 40;
export const PUBLIC_BETA_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const AUTH_TTL_MS = 24 * 60 * 60 * 1000;
export const DEDUPE_WINDOW_MS = 5 * 60 * 1000;

export const CLOSE_AUTH = 4001;
export const CLOSE_EXPIRED = 4003;
export const CLOSE_POLICY = 4008;
export const CLOSE_TOO_LARGE = 1009;
export const CLOSE_RATE = 4029;
export const CLOSE_OVERLOADED = 1013;

export function logEvent(
  event: string,
  fields: Record<string, unknown> = {},
): void {
  console.log(JSON.stringify({ event, ...fields }));
}
