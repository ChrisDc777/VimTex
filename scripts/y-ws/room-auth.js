/**
 * Capability tokens for room access (HMAC). Shared by the WS server and
 * Next API routes via createRequire / require.
 *
 * View token = HMAC-SHA256(secret, "ro:" + roomId) truncated base64url.
 * Knowing the room id alone remains the edit capability (RFC #20 / #23).
 */
const { createHmac, timingSafeEqual } = require('node:crypto')

const DEV_FALLBACK_SECRET = 'vimtex-dev-room-secret'

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

module.exports = {
  DEV_FALLBACK_SECRET,
  getRoomSecret,
  createViewToken,
  verifyViewToken,
}
