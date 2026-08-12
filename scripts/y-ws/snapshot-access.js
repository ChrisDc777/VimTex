/**
 * Capability checks for snapshot HTTP APIs (Level A history hardening).
 * Mirrors WS auth: view token (read), edit secret (write), auth token (password rooms).
 */
const {
  verifyViewToken,
  verifyEditSecret,
  verifyAuthToken,
} = require('./room-auth.js')
const {
  readRoomMeta,
  isRoomExpired,
  hasEditAcl,
} = require('./room-meta.js')

/**
 * @typedef {{
 *   edit?: string,
 *   view?: string,
 *   auth?: string,
 * }} SnapshotCredentials
 */

/**
 * @param {import('next/server').NextRequest | Request} req
 * @returns {SnapshotCredentials}
 */
function parseSnapshotCredentials (req) {
  const h = /** @type {Headers} */ (req.headers)
  return {
    edit: h.get('x-vimtex-edit')?.trim() || undefined,
    view: h.get('x-vimtex-view')?.trim() || undefined,
    auth: h.get('x-vimtex-auth')?.trim() || undefined,
  }
}

/**
 * @param {string} roomId
 * @param {SnapshotCredentials} creds
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
function authorizeSnapshotRead (roomId, creds) {
  const meta = readRoomMeta(roomId)
  if (isRoomExpired(meta)) {
    return { ok: false, status: 410, error: 'This room has expired.' }
  }
  if (meta?.passwordHash && !verifyAuthToken(roomId, creds.auth)) {
    return { ok: false, status: 401, error: 'Room password required.' }
  }
  if (!hasEditAcl(meta)) {
    return { ok: true }
  }
  if (verifyEditSecret(creds.edit, meta.editSecret)) {
    return { ok: true }
  }
  if (verifyViewToken(roomId, creds.view)) {
    return { ok: true }
  }
  return {
    ok: false,
    status: 403,
    error: 'View or edit capability required for version history.',
  }
}

/**
 * @param {string} roomId
 * @param {SnapshotCredentials} creds
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
function authorizeSnapshotWrite (roomId, creds) {
  const meta = readRoomMeta(roomId)
  if (isRoomExpired(meta)) {
    return { ok: false, status: 410, error: 'This room has expired.' }
  }
  if (meta?.passwordHash && !verifyAuthToken(roomId, creds.auth)) {
    return { ok: false, status: 401, error: 'Room password required.' }
  }
  if (!hasEditAcl(meta)) {
    return { ok: true }
  }
  if (verifyEditSecret(creds.edit, meta.editSecret)) {
    return { ok: true }
  }
  return {
    ok: false,
    status: 403,
    error: 'Edit capability required to modify checkpoints.',
  }
}

module.exports = {
  parseSnapshotCredentials,
  authorizeSnapshotRead,
  authorizeSnapshotWrite,
}
