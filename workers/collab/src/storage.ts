import {
  DEDUPE_WINDOW_MS,
  MAX_SNAPSHOTS_HARD_CAP,
  MAX_UNPINNED_SNAPSHOTS,
} from "./constants";

export const SCHEMA_VERSION = 1;

export type RoomMetaRow = {
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
  passwordHash: string | null;
  editSecretHash: string | null;
  editSecretLegacy: string | null;
  schemaVersion: number;
  expired: boolean;
};

export type SnapshotRow = {
  id: string;
  label: string;
  createdAt: number;
  byteLength: number;
  kind: string | null;
  contentHash: string | null;
  charLength: number | null;
  createdByName: string | null;
  createdByClientId: number | null;
  pinned: boolean;
  update: ArrayBuffer;
};

export function migrateSchema(sql: SqlStorage): void {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS room_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      expires_at INTEGER,
      password_hash TEXT,
      edit_secret_hash TEXT,
      edit_secret_legacy TEXT,
      schema_version INTEGER NOT NULL DEFAULT 1,
      expired INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS yjs_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      update_blob BLOB NOT NULL,
      updated_at INTEGER NOT NULL,
      byte_length INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      byte_length INTEGER NOT NULL,
      kind TEXT,
      content_hash TEXT,
      char_length INTEGER,
      created_by_name TEXT,
      created_by_client_id INTEGER,
      pinned INTEGER NOT NULL DEFAULT 0,
      update_blob BLOB NOT NULL
    );
  `);
}

export function readMeta(sql: SqlStorage): RoomMetaRow | null {
  const row = sql
    .exec(
      `SELECT created_at, updated_at, expires_at, password_hash, edit_secret_hash,
              edit_secret_legacy, schema_version, expired
       FROM room_meta WHERE id = 1`,
    )
    .one() as
    | {
        created_at: number;
        updated_at: number;
        expires_at: number | null;
        password_hash: string | null;
        edit_secret_hash: string | null;
        edit_secret_legacy: string | null;
        schema_version: number;
        expired: number;
      }
    | null;
  if (!row) return null;
  return {
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    expiresAt: row.expires_at == null ? null : Number(row.expires_at),
    passwordHash: row.password_hash,
    editSecretHash: row.edit_secret_hash,
    editSecretLegacy: row.edit_secret_legacy,
    schemaVersion: Number(row.schema_version) || SCHEMA_VERSION,
    expired: Boolean(row.expired),
  };
}

export function upsertMeta(
  sql: SqlStorage,
  patch: Partial<RoomMetaRow> & { createdAt?: number },
): RoomMetaRow {
  const prev = readMeta(sql);
  const now = Date.now();
  const next: RoomMetaRow = {
    createdAt: prev?.createdAt ?? patch.createdAt ?? now,
    updatedAt: now,
    expiresAt:
      patch.expiresAt !== undefined ? patch.expiresAt : (prev?.expiresAt ?? null),
    passwordHash:
      patch.passwordHash !== undefined
        ? patch.passwordHash
        : (prev?.passwordHash ?? null),
    editSecretHash:
      patch.editSecretHash !== undefined
        ? patch.editSecretHash
        : (prev?.editSecretHash ?? null),
    editSecretLegacy:
      patch.editSecretLegacy !== undefined
        ? patch.editSecretLegacy
        : (prev?.editSecretLegacy ?? null),
    schemaVersion: SCHEMA_VERSION,
    expired: patch.expired ?? prev?.expired ?? false,
  };
  sql.exec(
    `INSERT INTO room_meta (
      id, created_at, updated_at, expires_at, password_hash,
      edit_secret_hash, edit_secret_legacy, schema_version, expired
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      updated_at = excluded.updated_at,
      expires_at = excluded.expires_at,
      password_hash = excluded.password_hash,
      edit_secret_hash = excluded.edit_secret_hash,
      edit_secret_legacy = excluded.edit_secret_legacy,
      schema_version = excluded.schema_version,
      expired = excluded.expired`,
    next.createdAt,
    next.updatedAt,
    next.expiresAt,
    next.passwordHash,
    next.editSecretHash,
    next.editSecretLegacy,
    next.schemaVersion,
    next.expired ? 1 : 0,
  );
  return next;
}

export function readYjsState(sql: SqlStorage): Uint8Array | null {
  const row = sql
    .exec(`SELECT update_blob FROM yjs_state WHERE id = 1`)
    .one() as { update_blob: ArrayBuffer } | null;
  if (!row?.update_blob) return null;
  return new Uint8Array(row.update_blob);
}

export function writeYjsState(sql: SqlStorage, update: Uint8Array): void {
  sql.exec(
    `INSERT INTO yjs_state (id, update_blob, updated_at, byte_length)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       update_blob = excluded.update_blob,
       updated_at = excluded.updated_at,
       byte_length = excluded.byte_length`,
    update,
    Date.now(),
    update.byteLength,
  );
}

export function deleteYjsState(sql: SqlStorage): void {
  sql.exec(`DELETE FROM yjs_state`);
}

export function listSnapshots(sql: SqlStorage): SnapshotRow[] {
  const rows = sql
    .exec(
      `SELECT id, label, created_at, byte_length, kind, content_hash, char_length,
              created_by_name, created_by_client_id, pinned, update_blob
       FROM snapshots ORDER BY created_at DESC`,
    )
    .toArray() as Array<Record<string, unknown>>;
  return rows.map(rowToSnapshot);
}

export function querySnapshots(
  sql: SqlStorage,
  opts: { limit?: number; offset?: number; q?: string } = {},
): {
  snapshots: Omit<SnapshotRow, "update">[];
  total: number;
  limit: number;
  offset: number;
  q: string;
} {
  const q = (opts.q ?? "").trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const offset = Math.max(0, opts.offset ?? 0);
  const all = listSnapshots(sql).map(publicSnapshot);
  const filtered = q
    ? all.filter((s) => s.label.toLowerCase().includes(q))
    : all;
  return {
    snapshots: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
    q: opts.q ?? "",
  };
}

export function publicSnapshot(
  row: SnapshotRow,
): Omit<SnapshotRow, "update"> {
  const { update: _update, ...rest } = row;
  return rest;
}

export function readSnapshot(
  sql: SqlStorage,
  id: string,
): SnapshotRow | null {
  const row = sql
    .exec(
      `SELECT id, label, created_at, byte_length, kind, content_hash, char_length,
              created_by_name, created_by_client_id, pinned, update_blob
       FROM snapshots WHERE id = ?`,
      id,
    )
    .one() as Record<string, unknown> | null;
  return row ? rowToSnapshot(row) : null;
}

export function insertSnapshot(
  sql: SqlStorage,
  row: Omit<SnapshotRow, "update"> & { update: Uint8Array },
): void {
  sql.exec(
    `INSERT INTO snapshots (
      id, label, created_at, byte_length, kind, content_hash, char_length,
      created_by_name, created_by_client_id, pinned, update_blob
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.label,
    row.createdAt,
    row.byteLength,
    row.kind,
    row.contentHash,
    row.charLength,
    row.createdByName,
    row.createdByClientId,
    row.pinned ? 1 : 0,
    row.update,
  );
}

export function updateSnapshotMeta(
  sql: SqlStorage,
  id: string,
  patch: { label?: string; pinned?: boolean },
): SnapshotRow | null {
  const prev = readSnapshot(sql, id);
  if (!prev) return null;
  const label = patch.label !== undefined ? patch.label.slice(0, 80) : prev.label;
  const pinned = patch.pinned !== undefined ? patch.pinned : prev.pinned;
  sql.exec(
    `UPDATE snapshots SET label = ?, pinned = ? WHERE id = ?`,
    label,
    pinned ? 1 : 0,
    id,
  );
  return readSnapshot(sql, id);
}

export function deleteSnapshot(sql: SqlStorage, id: string): boolean {
  sql.exec(`DELETE FROM snapshots WHERE id = ?`, id);
  return true;
}

export function deleteAllSnapshots(sql: SqlStorage): void {
  sql.exec(`DELETE FROM snapshots`);
}

export function enforceSnapshotRetention(sql: SqlStorage): void {
  const snaps = listSnapshots(sql);
  const unpinned = snaps.filter((s) => !s.pinned);
  if (unpinned.length > MAX_UNPINNED_SNAPSHOTS) {
    for (const snap of unpinned.slice(MAX_UNPINNED_SNAPSHOTS)) {
      deleteSnapshot(sql, snap.id);
    }
  }
  const remaining = listSnapshots(sql);
  const overflow = remaining.length - MAX_SNAPSHOTS_HARD_CAP;
  if (overflow > 0) {
    const extra = remaining.filter((s) => !s.pinned).slice(-overflow);
    for (const snap of extra) deleteSnapshot(sql, snap.id);
  }
  if (listSnapshots(sql).length > MAX_SNAPSHOTS_HARD_CAP) {
    throw new Error(
      "Too many pinned checkpoints. Unpin or delete some before saving another.",
    );
  }
}

export function latestSnapshotMatches(
  sql: SqlStorage,
  contentHash: string,
  now = Date.now(),
): SnapshotRow | null {
  const latest = listSnapshots(sql)[0];
  if (
    latest &&
    latest.contentHash === contentHash &&
    now - latest.createdAt < DEDUPE_WINDOW_MS
  ) {
    return latest;
  }
  return null;
}

function rowToSnapshot(row: Record<string, unknown>): SnapshotRow {
  const blob = row.update_blob as ArrayBuffer;
  return {
    id: String(row.id),
    label: String(row.label),
    createdAt: Number(row.created_at),
    byteLength: Number(row.byte_length),
    kind: (row.kind as string | null) ?? null,
    contentHash: (row.content_hash as string | null) ?? null,
    charLength:
      row.char_length == null ? null : Number(row.char_length),
    createdByName: (row.created_by_name as string | null) ?? null,
    createdByClientId:
      row.created_by_client_id == null
        ? null
        : Number(row.created_by_client_id),
    pinned: Boolean(row.pinned),
    update: blob,
  };
}
