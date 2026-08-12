/**
 * Manual Yjs checkpoints for a room (encodeStateAsUpdate blobs on disk).
 */
const fs = require('node:fs')
const path = require('node:path')
const { createHash, randomBytes } = require('node:crypto')
const Y = require('yjs')
const { getRoomDataDir } = require('./room-meta.js')

/** Max checkpoints per room (FIFO when exceeded; pinned reserved for Level C). */
const MAX_SNAPSHOTS_PER_ROOM = Number(process.env.VIMTEX_MAX_SNAPSHOTS) || 50

/** Skip duplicate creates when hash matches latest within this window. */
const DEDUPE_WINDOW_MS = 5 * 60 * 1000

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
    ...(opts.createdBy ? { createdBy: opts.createdBy } : {}),
  }
  fs.writeFileSync(path.join(dir, `${id}.bin`), Buffer.from(update))
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(meta, null, 2))
  enforceRetention(roomId)
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
  readSnapshotUpdate,
  readSnapshotText,
  decodeSnapshotText,
  hashText,
  deleteSnapshot,
  deleteAllSnapshots,
}
