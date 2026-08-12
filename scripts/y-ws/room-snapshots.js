/**
 * Manual Yjs checkpoints for a room (encodeStateAsUpdate blobs on disk).
 */
const fs = require('node:fs')
const path = require('node:path')
const { createHash, randomBytes } = require('node:crypto')
const Y = require('yjs')
const { getRoomDataDir } = require('./room-meta.js')

/** Max unpinned checkpoints per room (FIFO). Pinned snapshots skip eviction. */
const MAX_SNAPSHOTS_PER_ROOM = Number(process.env.VIMTEX_MAX_SNAPSHOTS) || 50

/** Skip duplicate creates when hash matches latest within this window. */
const DEDUPE_WINDOW_MS = 5 * 60 * 1000

/**
 * Structured log for snapshot create/restore/patch. Never includes note text,
 * labels, or display names.
 * @param {'create' | 'restore' | 'patch'} action
 * @param {{
 *   roomId?: string,
 *   id?: string,
 *   snapId?: string,
 *   kind?: string,
 *   charLength?: number,
 *   byteLength?: number,
 *   pinned?: boolean,
 *   deduped?: boolean,
 * }} fields
 * @returns {Record<string, unknown>}
 */
function snapshotLogPayload (action, fields) {
  return {
    event: 'vimtex.snapshot',
    action,
    roomId: fields.roomId || null,
    snapId: fields.id || fields.snapId || null,
    kind: fields.kind || null,
    charLength: typeof fields.charLength === 'number' ? fields.charLength : null,
    byteLength: typeof fields.byteLength === 'number' ? fields.byteLength : null,
    pinned: Boolean(fields.pinned),
    deduped: Boolean(fields.deduped),
  }
}

/**
 * @param {'create' | 'restore' | 'patch'} action
 * @param {object} fields
 */
function logSnapshotEvent (action, fields) {
  console.info(JSON.stringify(snapshotLogPayload(action, fields)))
}

/**
 * @param {string} roomId
 * @returns {string}
 */
function snapshotsDir (roomId) {
  const safe = roomId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(getRoomDataDir(), 'snapshots', safe)
}

/**
 * @typedef {'manual' | 'pre_ai' | 'pre_restore' | 'auto_idle' | 'auto_interval' | 'named'} SnapshotKind
 */

/**
 * @typedef {{
 *   id: string,
 *   roomId: string,
 *   label: string,
 *   createdAt: number,
 *   byteLength: number,
 *   kind?: SnapshotKind,
 *   contentHash?: string,
 *   charLength?: number,
 *   createdBy?: { name?: string, clientId?: number },
 *   pinned?: boolean,
 * }} SnapshotMeta
 */

/**
 * @param {Uint8Array} update
 * @returns {string}
 */
function decodeSnapshotText (update) {
  const doc = new Y.Doc()
  try {
    Y.applyUpdate(doc, update)
    return doc.getText('codemirror').toString()
  } finally {
    doc.destroy()
  }
}

/**
 * @param {string} text
 * @returns {string}
 */
function hashText (text) {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16)
}

/**
 * @param {string} label
 * @returns {SnapshotKind}
 */
function inferKindFromLabel (label) {
  const trimmed = (label || '').trim()
  if (trimmed.startsWith('Pre-AI:')) return 'pre_ai'
  if (trimmed.startsWith('Pre-restore:')) return 'pre_restore'
  return 'manual'
}

/**
 * @param {unknown} raw
 * @returns {SnapshotMeta}
 */
function normalizeMeta (raw) {
  const meta = /** @type {SnapshotMeta} */ (raw)
  if (!meta.kind) meta.kind = inferKindFromLabel(meta.label)
  return meta
}

/**
 * @param {string} roomId
 * @returns {SnapshotMeta[]}
 */
function listSnapshots (roomId) {
  const dir = snapshotsDir(roomId)
  if (!fs.existsSync(dir)) return []
  /** @type {SnapshotMeta[]} */
  const out = []
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue
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
 * @param {string} roomId
 */
function enforceRetention (roomId) {
  const snaps = listSnapshots(roomId)
  const unpinned = snaps.filter((s) => !s.pinned)
  if (unpinned.length <= MAX_SNAPSHOTS_PER_ROOM) return
  const toRemove = unpinned.slice(MAX_SNAPSHOTS_PER_ROOM)
  for (const snap of toRemove) {
    deleteSnapshot(roomId, snap.id)
  }
}

/**
 * @param {string} roomId
 * @param {Uint8Array} update
 * @param {string} [label]
 * @param {{
 *   kind?: SnapshotKind,
 *   createdBy?: { name?: string, clientId?: number },
 *   skipDedupe?: boolean,
 * }} [opts]
 * @returns {SnapshotMeta}
 */
function createSnapshot (roomId, update, label = '', opts = {}) {
  const dir = snapshotsDir(roomId)
  fs.mkdirSync(dir, { recursive: true })
  const text = decodeSnapshotText(update)
  const contentHash = hashText(text)
  const kind = opts.kind || inferKindFromLabel(label)

  if (!opts.skipDedupe) {
    const latest = listSnapshots(roomId)[0]
    if (
      latest &&
      latest.contentHash === contentHash &&
      Date.now() - latest.createdAt < DEDUPE_WINDOW_MS
    ) {
      logSnapshotEvent('create', { ...latest, deduped: true })
      return latest
    }
  }

  const id = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`
  const meta = {
    id,
    roomId,
    label:
      (label || '').trim().slice(0, 80) ||
      `Checkpoint ${new Date().toLocaleString()}`,
    createdAt: Date.now(),
    byteLength: update.byteLength,
    kind,
    contentHash,
    charLength: text.length,
    pinned: false,
    ...(opts.createdBy ? { createdBy: opts.createdBy } : {}),
  }
  fs.writeFileSync(path.join(dir, `${id}.bin`), Buffer.from(update))
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(meta, null, 2))
  enforceRetention(roomId)
  logSnapshotEvent('create', meta)
  return meta
}

/**
 * @param {string} roomId
 * @param {string} snapshotId
 * @returns {SnapshotMeta | null}
 */
function readSnapshotMeta (roomId, snapshotId) {
  const safeId = snapshotId.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safeId) return null
  const file = path.join(snapshotsDir(roomId), `${safeId}.json`)
  try {
    return normalizeMeta(JSON.parse(fs.readFileSync(file, 'utf8')))
  } catch {
    return null
  }
}

/**
 * Pin and/or rename a checkpoint. Does not rewrite the .bin payload.
 * @param {string} roomId
 * @param {string} snapshotId
 * @param {{ label?: string, pinned?: boolean }} patch
 * @returns {SnapshotMeta | null}
 */
function updateSnapshotMeta (roomId, snapshotId, patch) {
  const meta = readSnapshotMeta(roomId, snapshotId)
  if (!meta) return null
  const safeId = snapshotId.replace(/[^a-zA-Z0-9_-]/g, '')
  if (typeof patch.label === 'string') {
    const nextLabel = patch.label.trim().slice(0, 80)
    if (nextLabel) {
      meta.label = nextLabel
      if (meta.kind === 'manual' || !meta.kind) meta.kind = 'named'
    }
  }
  if (typeof patch.pinned === 'boolean') {
    meta.pinned = patch.pinned
  }
  fs.writeFileSync(
    path.join(snapshotsDir(roomId), `${safeId}.json`),
    JSON.stringify(meta, null, 2),
  )
  logSnapshotEvent('patch', meta)
  return meta
}

/**
 * @param {string} roomId
 * @param {string} snapshotId
 * @returns {Uint8Array | null}
 */
function readSnapshotUpdate (roomId, snapshotId) {
  const safeId = snapshotId.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safeId) return null
  const file = path.join(snapshotsDir(roomId), `${safeId}.bin`)
  try {
    return new Uint8Array(fs.readFileSync(file))
  } catch {
    return null
  }
}

/**
 * @param {string} roomId
 * @param {string} snapshotId
 * @returns {string | null}
 */
function readSnapshotText (roomId, snapshotId) {
  const update = readSnapshotUpdate(roomId, snapshotId)
  if (!update) return null
  return decodeSnapshotText(update)
}

/**
 * @param {string} roomId
 * @param {string} snapshotId
 * @returns {boolean}
 */
function deleteSnapshot (roomId, snapshotId) {
  const safeId = snapshotId.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safeId) return false
  const dir = snapshotsDir(roomId)
  let ok = false
  for (const ext of ['.bin', '.json']) {
    try {
      fs.unlinkSync(path.join(dir, `${safeId}${ext}`))
      ok = true
    } catch {
      // ignore
    }
  }
  return ok
}

/**
 * Remove all snapshots for a room (room TTL purge).
 * @param {string} roomId
 */
function deleteAllSnapshots (roomId) {
  const dir = snapshotsDir(roomId)
  if (!fs.existsSync(dir)) return
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

module.exports = {
  MAX_SNAPSHOTS_PER_ROOM,
  listSnapshots,
  createSnapshot,
  readSnapshotMeta,
  updateSnapshotMeta,
  readSnapshotUpdate,
  readSnapshotText,
  decodeSnapshotText,
  hashText,
  deleteSnapshot,
  deleteAllSnapshots,
  snapshotLogPayload,
  logSnapshotEvent,
}
