/**
 * Manual Yjs checkpoints for a room (encodeStateAsUpdate blobs on disk).
 */
const fs = require('node:fs')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { getRoomDataDir } = require('./room-meta.js')

/**
 * @param {string} roomId
 * @returns {string}
 */
function snapshotsDir (roomId) {
  const safe = roomId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(getRoomDataDir(), 'snapshots', safe)
}

/**
 * @typedef {{
 *   id: string,
 *   roomId: string,
 *   label: string,
 *   createdAt: number,
 *   byteLength: number,
 * }} SnapshotMeta
 */

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
      if (meta && typeof meta.id === 'string') out.push(meta)
    } catch {
      // skip corrupt
    }
  }
  out.sort((a, b) => b.createdAt - a.createdAt)
  return out
}

/**
 * @param {string} roomId
 * @param {Uint8Array} update
 * @param {string} [label]
 * @returns {SnapshotMeta}
 */
function createSnapshot (roomId, update, label = '') {
  const dir = snapshotsDir(roomId)
  fs.mkdirSync(dir, { recursive: true })
  const id = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`
  const meta = {
    id,
    roomId,
    label: (label || '').trim().slice(0, 80) || `Checkpoint ${new Date().toLocaleString()}`,
    createdAt: Date.now(),
    byteLength: update.byteLength,
  }
  fs.writeFileSync(path.join(dir, `${id}.bin`), Buffer.from(update))
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(meta, null, 2))
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

module.exports = {
  listSnapshots,
  createSnapshot,
  readSnapshotUpdate,
  deleteSnapshot,
}
