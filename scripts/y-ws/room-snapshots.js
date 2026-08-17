/**
 * Manual Yjs checkpoints for a room (encodeStateAsUpdate blobs on disk).
 */
const fs = require('node:fs')
const path = require('node:path')
const { createHash, randomBytes } = require('node:crypto')
const Y = require('yjs')
const { getRoomDataDir } = require('./room-meta.js')
const {
  listIndexedSnapshots,
  rebuildSnapshotIndex,
  paginateSnapshots,
  INDEX_NAME,
} = require('./snapshot-index.js')
const { createEditSecret } = require('./room-auth.js')
const { upsertRoomMeta } = require('./room-meta.js')

/** Max unpinned checkpoints per room (FIFO). Pinned snapshots skip eviction. */
const MAX_SNAPSHOTS_PER_ROOM = Number(process.env.VIMTEX_MAX_SNAPSHOTS) || 50
/** Hard cap including pinned — pinned cannot exhaust storage. */
const MAX_SNAPSHOTS_HARD_CAP = Number(process.env.VIMTEX_MAX_SNAPSHOTS_HARD) || 100

/** Skip duplicate creates when hash matches latest within this window. */
const DEDUPE_WINDOW_MS = 5 * 60 * 1000

/**
 * Structured log for snapshot create/restore/patch. Never includes note text,
 * labels, or display names.
 * @param {'create' | 'restore' | 'patch' | 'fork'} action
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
 * @param {'create' | 'restore' | 'patch' | 'fork'} action
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
function listSnapshotsFromFs (roomId) {
  const dir = snapshotsDir(roomId)
  if (!fs.existsSync(dir)) return []
  /** @type {SnapshotMeta[]} */
  const out = []
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json') || name === INDEX_NAME || name.startsWith('_')) {
      continue
    }
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
 * Dual-read: prefer metadata index, rebuild from FS metas when missing (#127).
 * @param {string} roomId
 * @returns {SnapshotMeta[]}
 */
function listSnapshots (roomId) {
  return /** @type {SnapshotMeta[]} */ (
    listIndexedSnapshots(snapshotsDir(roomId), normalizeMeta)
  )
}

/**
 * @param {string} roomId
 * @param {{ limit?: number, offset?: number, q?: string }} [opts]
 */
function querySnapshots (roomId, opts = {}) {
  return paginateSnapshots({
    snapshots: listSnapshots(roomId),
    limit: opts.limit,
    offset: opts.offset,
    q: opts.q,
  })
}

/**
 * Refresh index after create / patch / delete.
 * @param {string} roomId
 */
function refreshSnapshotIndex (roomId) {
  rebuildSnapshotIndex(snapshotsDir(roomId), normalizeMeta)
}

/**
 * @param {string} roomId
 */
function enforceRetention (roomId) {
  const snaps = listSnapshotsFromFs(roomId)
  const unpinned = snaps.filter((s) => !s.pinned)
  if (unpinned.length > MAX_SNAPSHOTS_PER_ROOM) {
    const toRemove = unpinned.slice(MAX_SNAPSHOTS_PER_ROOM)
    for (const snap of toRemove) {
      deleteSnapshot(roomId, snap.id)
    }
  }
  const remaining = listSnapshotsFromFs(roomId)
  const overflow = remaining.length - MAX_SNAPSHOTS_HARD_CAP
  if (overflow <= 0) return
  const extraUnpinned = remaining.filter((s) => !s.pinned).slice(-overflow)
  for (const snap of extraUnpinned) {
    deleteSnapshot(roomId, snap.id)
  }
  if (listSnapshotsFromFs(roomId).length > MAX_SNAPSHOTS_HARD_CAP) {
    const err = new Error(
      'Too many pinned checkpoints. Unpin or delete some before saving another.',
    )
    err.code = 'SNAPSHOT_HARD_CAP'
    throw err
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
  refreshSnapshotIndex(roomId)
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
  refreshSnapshotIndex(roomId)
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
  if (ok) refreshSnapshotIndex(roomId)
  return ok
}

/**
 * Remove all snapshots for a room (room TTL purge) — index cascades with dir.
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

/**
 * Fork a checkpoint into a brand-new room with its own editSecret (#128).
 * Account authorship remapping is deferred until claim-guest (#37 / #78).
 *
 * @param {string} sourceRoomId
 * @param {string} snapshotId
 * @param {{ createdBy?: { name?: string, clientId?: number } }} [opts]
 * @returns {{
 *   roomId: string,
 *   edit: string,
 *   snapshot: SnapshotMeta,
 *   sourceSnapId: string,
 *   charLength: number,
 * } | null}
 */
function forkSnapshot (sourceRoomId, snapshotId, opts = {}) {
  const text = readSnapshotText(sourceRoomId, snapshotId)
  const sourceMeta = readSnapshotMeta(sourceRoomId, snapshotId)
  if (text == null || !sourceMeta) return null

  const newRoomId = randomBytes(8).toString('hex')
  const edit = createEditSecret()
  upsertRoomMeta(newRoomId, { editSecret: edit })

  const snapDoc = new Y.Doc()
  let update
  try {
    if (text.length > 0) {
      snapDoc.getText('codemirror').insert(0, text)
    }
    update = Y.encodeStateAsUpdate(snapDoc)
  } finally {
    snapDoc.destroy()
  }

  const label = `Forked from ${sourceMeta.label}`.slice(0, 80)
  const snapshot = createSnapshot(newRoomId, update, label, {
    kind: 'named',
    skipDedupe: true,
    ...(opts.createdBy ? { createdBy: opts.createdBy } : {}),
  })

  // Seed the live Y.Doc before the client navigates — checkpoint-only fork
  // left the first sync empty (or re-seeded starter content).
  seedLiveYDoc(newRoomId, update)

  logSnapshotEvent('fork', {
    roomId: newRoomId,
    snapId: snapshot.id,
    kind: snapshot.kind,
    charLength: snapshot.charLength,
    byteLength: snapshot.byteLength,
  })

  return {
    roomId: newRoomId,
    edit,
    snapshot,
    sourceSnapId: snapshotId,
    charLength: text.length,
  }
}

/**
 * Apply a Yjs update to the in-memory room doc (and broadcast via updateHandler).
 * Used to seed a forked room before the first WebSocket client connects.
 * @param {string} roomId
 * @param {Uint8Array} update
 */
function seedLiveYDoc (roomId, update) {
  const { getYDoc } = require('./utils.js')
  const doc = getYDoc(roomId)
  Y.applyUpdate(doc, update)
}

/**
 * Replace only the `codemirror` Y.Text on the live room doc. Chat is preserved.
 * Broadcasts to connected peers through the doc update handler.
 * @param {string} roomId
 * @param {string} text
 * @returns {string}
 */
function restoreLiveCodemirror (roomId, text) {
  const { getYDoc } = require('./utils.js')
  const doc = getYDoc(roomId)
  const ytext = doc.getText('codemirror')
  doc.transact(() => {
    const len = ytext.length
    if (len > 0) ytext.delete(0, len)
    if (text.length > 0) ytext.insert(0, text)
  }, 'snapshot-restore')
  return ytext.toString()
}

/**
 * Placeholder for M5 claim-guest authorship remapping (#128 / #37).
 * @param {string} _roomId
 * @param {{ fromClientId?: number, toUserId?: string }} _mapping
 * @returns {{ updated: number }}
 */
function remapSnapshotAuthorship (_roomId, _mapping) {
  // No accounts yet — return zero updates. Wired after claim-guest.
  return { updated: 0 }
}

module.exports = {
  MAX_SNAPSHOTS_PER_ROOM,
  MAX_SNAPSHOTS_HARD_CAP,
  listSnapshots,
  listSnapshotsFromFs,
  querySnapshots,
  refreshSnapshotIndex,
  createSnapshot,
  readSnapshotMeta,
  updateSnapshotMeta,
  readSnapshotUpdate,
  readSnapshotText,
  decodeSnapshotText,
  hashText,
  deleteSnapshot,
  deleteAllSnapshots,
  forkSnapshot,
  seedLiveYDoc,
  restoreLiveCodemirror,
  remapSnapshotAuthorship,
  snapshotLogPayload,
  logSnapshotEvent,
}
