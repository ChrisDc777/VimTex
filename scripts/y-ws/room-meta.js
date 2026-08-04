/**
 * Filesystem room metadata (password hash, absolute TTL).
 * Directory: ROOM_DATA_DIR, or `<YPERSISTENCE>/../rooms`, or `.data/rooms`.
 */
const fs = require('node:fs')
const path = require('node:path')

/**
 * @returns {string}
 */
function getRoomDataDir () {
  const fromEnv = process.env.ROOM_DATA_DIR
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return path.resolve(fromEnv.trim())
  }
  const ypersist = process.env.YPERSISTENCE
  if (typeof ypersist === 'string' && ypersist.trim()) {
    return path.resolve(ypersist.trim(), '..', 'rooms')
  }
  return path.resolve(process.cwd(), '.data', 'rooms')
}

/**
 * @param {string} roomId
 * @returns {string}
 */
function metaPath (roomId) {
  // Keep filenames safe: room ids are hex / alnum.
  const safe = roomId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(getRoomDataDir(), `${safe}.json`)
}

/**
 * @typedef {{
 *   roomId: string,
 *   createdAt: number,
 *   updatedAt: number,
 *   expiresAt: number | null,
 *   passwordHash: string | null,
 * }} RoomMeta
 */

/**
 * @param {string} roomId
 * @returns {RoomMeta | null}
 */
function readRoomMeta (roomId) {
  try {
    const raw = fs.readFileSync(metaPath(roomId), 'utf8')
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    return {
      roomId: typeof data.roomId === 'string' ? data.roomId : roomId,
      createdAt: Number(data.createdAt) || Date.now(),
      updatedAt: Number(data.updatedAt) || Date.now(),
      expiresAt:
        data.expiresAt == null || data.expiresAt === ''
          ? null
          : Number(data.expiresAt),
      passwordHash:
        typeof data.passwordHash === 'string' && data.passwordHash
          ? data.passwordHash
          : null,
    }
  } catch (err) {
    if (err && err.code === 'ENOENT') return null
    console.error('[vimtex] Failed to read room meta', roomId, err)
    return null
  }
}

/**
 * @param {RoomMeta} meta
 * @returns {RoomMeta}
 */
function writeRoomMeta (meta) {
  const dir = getRoomDataDir()
  fs.mkdirSync(dir, { recursive: true })
  const next = {
    ...meta,
    updatedAt: Date.now(),
  }
  fs.writeFileSync(metaPath(meta.roomId), JSON.stringify(next, null, 2), 'utf8')
  return next
}

/**
 * @param {string} roomId
 * @param {Partial<Omit<RoomMeta, 'roomId' | 'createdAt'>> & { createdAt?: number }} patch
 * @returns {RoomMeta}
 */
function upsertRoomMeta (roomId, patch) {
  const existing = readRoomMeta(roomId)
  const now = Date.now()
  const next = {
    roomId,
    createdAt: existing?.createdAt ?? patch.createdAt ?? now,
    updatedAt: now,
    expiresAt:
      patch.expiresAt !== undefined
        ? patch.expiresAt
        : (existing?.expiresAt ?? null),
    passwordHash:
      patch.passwordHash !== undefined
        ? patch.passwordHash
        : (existing?.passwordHash ?? null),
  }
  return writeRoomMeta(next)
}

/**
 * @param {RoomMeta | null} meta
 * @returns {boolean}
 */
function isRoomExpired (meta) {
  if (!meta || meta.expiresAt == null) return false
  return Date.now() > Number(meta.expiresAt)
}

module.exports = {
  getRoomDataDir,
  readRoomMeta,
  writeRoomMeta,
  upsertRoomMeta,
  isRoomExpired,
}
