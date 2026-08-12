/**
 * Snapshot metadata index (#127 Level D).
 *
 * Dual-read cutover:
 * 1. Prefer `_index.json` beside per-snapshot `.json` metas (fast list / filter).
 * 2. If missing or corrupt, rebuild from FS metas (source of truth for blobs).
 * 3. Future: swap this module for SQLite/Postgres without changing API callers
 *    (`querySnapshots` / `rebuildSnapshotIndex` / `clearSnapshotIndex`).
 *
 * Room TTL: `deleteAllSnapshots` removes the room directory → index cascades.
 */
const fs = require('node:fs')
const path = require('node:path')

const INDEX_NAME = '_index.json'
const INDEX_VERSION = 1

/**
 * @param {string} dir
 * @returns {string}
 */
function indexPath (dir) {
  return path.join(dir, INDEX_NAME)
}

/**
 * @param {import('./room-snapshots.js').SnapshotMeta} meta
 * @returns {object}
 */
function slimMeta (meta) {
  return {
    id: meta.id,
    roomId: meta.roomId,
    label: meta.label,
    createdAt: meta.createdAt,
    byteLength: meta.byteLength,
    kind: meta.kind,
    contentHash: meta.contentHash,
    charLength: meta.charLength,
    pinned: Boolean(meta.pinned),
    ...(meta.createdBy ? { createdBy: meta.createdBy } : {}),
  }
}

/**
 * Scan filesystem metas (skips `_index.json`).
 * @param {string} dir
 * @param {(raw: unknown) => object} normalizeMeta
 * @returns {object[]}
 */
function scanFsMetas (dir, normalizeMeta) {
  if (!fs.existsSync(dir)) return []
  /** @type {object[]} */
  const out = []
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json') || name.startsWith('_')) continue
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))
      if (meta && typeof meta.id === 'string') out.push(normalizeMeta(meta))
    } catch {
      // skip corrupt
    }
  }
  out.sort((a, b) => b.createdAt - a.createdAt)
  return out
}

/**
 * @param {string} dir
 * @param {object[]} snaps
 */
function writeIndexFile (dir, snaps) {
  fs.mkdirSync(dir, { recursive: true })
  const payload = {
    version: INDEX_VERSION,
    updatedAt: Date.now(),
    snapshots: snaps.map(slimMeta),
  }
  fs.writeFileSync(indexPath(dir), JSON.stringify(payload, null, 2))
}

/**
 * @param {string} dir
 * @param {(raw: unknown) => object} normalizeMeta
 * @returns {object[] | null}
 */
function readIndexFile (dir, normalizeMeta) {
  try {
    const raw = JSON.parse(fs.readFileSync(indexPath(dir), 'utf8'))
    if (!raw || raw.version !== INDEX_VERSION || !Array.isArray(raw.snapshots)) {
      return null
    }
    return raw.snapshots.map(normalizeMeta)
  } catch {
    return null
  }
}

/**
 * Dual-read list: index first, rebuild from FS when needed.
 * @param {string} dir
 * @param {(raw: unknown) => object} normalizeMeta
 * @returns {object[]}
 */
function listIndexedSnapshots (dir, normalizeMeta) {
  const indexed = readIndexFile(dir, normalizeMeta)
  if (indexed) return indexed
  const fromFs = scanFsMetas(dir, normalizeMeta)
  if (fromFs.length > 0 || fs.existsSync(dir)) {
    writeIndexFile(dir, fromFs)
  }
  return fromFs
}

/**
 * @param {string} dir
 * @param {(raw: unknown) => object} normalizeMeta
 * @returns {object[]}
 */
function rebuildSnapshotIndex (dir, normalizeMeta) {
  const snaps = scanFsMetas(dir, normalizeMeta)
  writeIndexFile(dir, snaps)
  return snaps
}

/**
 * @param {{
 *   snapshots: object[],
 *   limit?: number,
 *   offset?: number,
 *   q?: string,
 * }} opts
 * @returns {{ snapshots: object[], total: number, limit: number, offset: number, q: string }}
 */
function paginateSnapshots ({ snapshots, limit = 50, offset = 0, q = '' }) {
  const needle = (q || '').trim().toLowerCase()
  let filtered = snapshots
  if (needle) {
    filtered = snapshots.filter((s) => {
      const label = String(s.label || '').toLowerCase()
      const kind = String(s.kind || '').toLowerCase()
      return label.includes(needle) || kind.includes(needle)
    })
  }
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50))
  const safeOffset = Math.max(0, Number(offset) || 0)
  return {
    snapshots: filtered.slice(safeOffset, safeOffset + safeLimit),
    total: filtered.length,
    limit: safeLimit,
    offset: safeOffset,
    q: needle,
  }
}

module.exports = {
  INDEX_NAME,
  INDEX_VERSION,
  slimMeta,
  scanFsMetas,
  writeIndexFile,
  readIndexFile,
  listIndexedSnapshots,
  rebuildSnapshotIndex,
  paginateSnapshots,
}
