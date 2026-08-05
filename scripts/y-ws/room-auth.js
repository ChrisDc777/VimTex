/**
 * Capability tokens for room access (HMAC + opaque edit secrets).
 * Shared by the WS server and Next API routes via createRequire / require.
 *
 * View token = HMAC-SHA256(secret, "ro:" + roomId) truncated base64url.
 * Edit secret = opaque random stored in room meta (guest capability).
 * Auth token = expiryMs.sig — unlocks password-protected rooms for a session.
 *
 * Once a room has editSecret, knowing the room id alone is not enough to write.
 */
const { createHmac, timingSafeEqual, scryptSync, randomBytes } = require('node:crypto')

const DEV_FALLBACK_SECRET = 'vimtex-dev-room-secret'
const DEFAULT_AUTH_TTL_MS = 24 * 60 * 60 * 1000

/**
 * @returns {string}
 */
function getRoomSecret () {
  const fromEnv = process.env.ROOM_SECRET
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim()
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[vimtex] ROOM_SECRET is unset; using a weak built-in secret. Set ROOM_SECRET in production.',
    )
  }
  return DEV_FALLBACK_SECRET
}

/**
 * @param {string} roomId
 * @param {string} [secret]
 * @returns {string}
 */
function createViewToken (roomId, secret = getRoomSecret()) {
  if (typeof roomId !== 'string' || roomId.length === 0) {
    throw new Error('roomId required')
  }
  return createHmac('sha256', secret)
    .update(`ro:${roomId}`, 'utf8')
    .digest('base64url')
    .slice(0, 22)
}

/**
 * @param {string} roomId
 * @param {string | null | undefined} token
 * @param {string} [secret]
 * @returns {boolean}
 */
function verifyViewToken (roomId, token, secret = getRoomSecret()) {
  if (typeof token !== 'string' || token.length === 0) return false
  if (typeof roomId !== 'string' || roomId.length === 0) return false
  const expected = createViewToken(roomId, secret)
  try {
    const a = Buffer.from(token)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/** @returns {string} Opaque edit capability for a room (store in room meta). */
function createEditSecret () {
  return randomBytes(24).toString('base64url')
}

/**
 * @param {string | null | undefined} presented
 * @param {string | null | undefined} stored
 * @returns {boolean}
 */
function verifyEditSecret (presented, stored) {
  if (typeof presented !== 'string' || presented.length === 0) return false
  if (typeof stored !== 'string' || stored.length === 0) return false
  try {
    const a = Buffer.from(presented)
    const b = Buffer.from(stored)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * @param {string} roomId
 * @param {number} [ttlMs]
 * @param {string} [secret]
 * @returns {string}
 */
function createAuthToken (roomId, ttlMs = DEFAULT_AUTH_TTL_MS, secret = getRoomSecret()) {
  if (typeof roomId !== 'string' || roomId.length === 0) {
    throw new Error('roomId required')
  }
  const expiresAt = Date.now() + Math.max(60_000, ttlMs)
  const sig = createHmac('sha256', secret)
    .update(`auth:${roomId}:${expiresAt}`, 'utf8')
    .digest('base64url')
    .slice(0, 22)
  return `${expiresAt}.${sig}`
}

/**
 * @param {string} roomId
 * @param {string | null | undefined} token
 * @param {string} [secret]
 * @returns {boolean}
 */
function verifyAuthToken (roomId, token, secret = getRoomSecret()) {
  if (typeof token !== 'string' || token.length === 0) return false
  if (typeof roomId !== 'string' || roomId.length === 0) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const expiresAt = Number(parts[0])
  const sig = parts[1]
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false
  const expected = createHmac('sha256', secret)
    .update(`auth:${roomId}:${expiresAt}`, 'utf8')
    .digest('base64url')
    .slice(0, 22)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * @param {string} password
 * @returns {string} saltHex:hashHex
 */
function hashPassword (password) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 32)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

/**
 * @param {string} password
 * @param {string | null | undefined} stored
 * @returns {boolean}
 */
function verifyPassword (password, stored) {
  if (typeof password !== 'string' || !stored || typeof stored !== 'string') {
    return false
  }
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  try {
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const actual = scryptSync(password, salt, expected.length)
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

module.exports = {
  DEV_FALLBACK_SECRET,
  DEFAULT_AUTH_TTL_MS,
  getRoomSecret,
  createViewToken,
  verifyViewToken,
  createEditSecret,
  verifyEditSecret,
  createAuthToken,
  verifyAuthToken,
  hashPassword,
  verifyPassword,
}
