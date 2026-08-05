const Y = require('yjs')
const syncProtocol = require('y-protocols/dist/sync.cjs')
const awarenessProtocol = require('y-protocols/dist/awareness.cjs')

const encoding = require('lib0/dist/encoding.cjs')
const decoding = require('lib0/dist/decoding.cjs')
const map = require('lib0/dist/map.cjs')

const debounce = require('lodash.debounce')

const callbackHandler = require('./callback.js').callbackHandler
const isCallbackSet = require('./callback.js').isCallbackSet
const { verifyViewToken, verifyAuthToken, verifyEditSecret } = require('./room-auth.js')
const { readRoomMeta, isRoomExpired, hasEditAcl } = require('./room-meta.js')

const CALLBACK_DEBOUNCE_WAIT = parseInt(process.env.CALLBACK_DEBOUNCE_WAIT) || 2000
const CALLBACK_DEBOUNCE_MAXWAIT = parseInt(process.env.CALLBACK_DEBOUNCE_MAXWAIT) || 10000

const wsReadyStateConnecting = 0
const wsReadyStateOpen = 1
const wsReadyStateClosing = 2 // eslint-disable-line
const wsReadyStateClosed = 3 // eslint-disable-line

// disable gc when using snapshots!
const gcEnabled = process.env.GC !== 'false' && process.env.GC !== '0'
const persistenceDir = process.env.YPERSISTENCE

/** Default idle TTL before an empty in-memory room is destroyed (30 minutes). */
const DEFAULT_YROOM_IDLE_MS = 30 * 60 * 1000
const yroomIdleMs = (() => {
  const raw = process.env.YROOM_IDLE_MS
  if (raw === undefined || raw === '') return DEFAULT_YROOM_IDLE_MS
  const parsed = parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_YROOM_IDLE_MS
})()

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const idleGcTimers = new Map()
/**
 * @type {{bindState: function(string,WSSharedDoc):void, writeState:function(string,WSSharedDoc):Promise<any>, provider: any}|null}
 */
let persistence = null
if (typeof persistenceDir === 'string' && persistenceDir.length > 0) {
  let LeveldbPersistence
  try {
    // Optional durable store — package is declared; fail clearly if install skipped.
    LeveldbPersistence = require('y-leveldb').LeveldbPersistence
  } catch (err) {
    console.error(
      '[vimtex] YPERSISTENCE is set but y-leveldb could not be loaded.',
      'Run `npm install` (y-leveldb is a dependency).',
      err instanceof Error ? err.message : err,
    )
    throw err
  }
  console.info('[vimtex] Persisting Yjs documents to "' + persistenceDir + '"')
  const ldb = new LeveldbPersistence(persistenceDir)
  persistence = {
    provider: ldb,
    bindState: async (docName, ydoc) => {
      const persistedYdoc = await ldb.getYDoc(docName)
      const newUpdates = Y.encodeStateAsUpdate(ydoc)
      ldb.storeUpdate(docName, newUpdates)
      Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc))
      ydoc.on('update', update => {
        ldb.storeUpdate(docName, update)
      })
    },
    writeState: async (docName, ydoc) => {}
  }
}

/**
 * @param {{bindState: function(string,WSSharedDoc):void,
 * writeState:function(string,WSSharedDoc):Promise<any>,provider:any}|null} persistence_
 */
exports.setPersistence = persistence_ => {
  persistence = persistence_
}

/**
 * @return {null|{bindState: function(string,WSSharedDoc):void,
  * writeState:function(string,WSSharedDoc):Promise<any>}|null} used persistence layer
  */
exports.getPersistence = () => persistence

/**
 * @type {Map<string,WSSharedDoc>}
 */
const docs = new Map()
// exporting docs so that others can use it
exports.docs = docs

const messageSync = 0
const messageAwareness = 1
// const messageAuth = 2

/**
 * @param {Uint8Array} update
 * @param {any} origin
 * @param {WSSharedDoc} doc
 */
const updateHandler = (update, origin, doc) => {
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, messageSync)
  syncProtocol.writeUpdate(encoder, update)
  const message = encoding.toUint8Array(encoder)
  doc.conns.forEach((_, conn) => send(doc, conn, message))
}

class WSSharedDoc extends Y.Doc {
  /**
   * @param {string} name
   */
  constructor (name) {
    super({ gc: gcEnabled })
    this.name = name
    /**
     * Maps from conn to set of controlled user ids. Delete all user ids from awareness when this conn is closed
     * @type {Map<Object, Set<number>>}
     */
    this.conns = new Map()
    /**
     * @type {awarenessProtocol.Awareness}
     */
    this.awareness = new awarenessProtocol.Awareness(this)
    this.awareness.setLocalState(null)
    /**
     * @param {{ added: Array<number>, updated: Array<number>, removed: Array<number> }} changes
     * @param {Object | null} conn Origin is the connection that made the change
     */
    const awarenessChangeHandler = ({ added, updated, removed }, conn) => {
      const changedClients = added.concat(updated, removed)
      if (conn !== null) {
        const connControlledIDs = /** @type {Set<number>} */ (this.conns.get(conn))
        if (connControlledIDs !== undefined) {
          added.forEach(clientID => { connControlledIDs.add(clientID) })
          removed.forEach(clientID => { connControlledIDs.delete(clientID) })
        }
      }
      // broadcast awareness update
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients))
      const buff = encoding.toUint8Array(encoder)
      this.conns.forEach((_, c) => {
        send(this, c, buff)
      })
    }
    this.awareness.on('update', awarenessChangeHandler)
    this.on('update', updateHandler)
    if (isCallbackSet) {
      this.on('update', debounce(
        callbackHandler,
        CALLBACK_DEBOUNCE_WAIT,
        { maxWait: CALLBACK_DEBOUNCE_MAXWAIT }
      ))
    }
  }
}

/**
 * Gets a Y.Doc by name, whether in memory or on disk
 *
 * @param {string} docname - the name of the Y.Doc to find or create
 * @param {boolean} gc - whether to allow gc on the doc (applies only when created)
 * @return {WSSharedDoc}
 */
const cancelIdleGc = docname => {
  const timer = idleGcTimers.get(docname)
  if (timer !== undefined) {
    clearTimeout(timer)
    idleGcTimers.delete(docname)
  }
}

const destroyDoc = doc => {
  if (persistence !== null) {
    persistence.writeState(doc.name, doc).then(() => {
      doc.destroy()
    })
  } else {
    doc.destroy()
  }
  docs.delete(doc.name)
}

const scheduleIdleGc = doc => {
  cancelIdleGc(doc.name)
  if (yroomIdleMs === 0) {
    destroyDoc(doc)
    return
  }
  const timer = setTimeout(() => {
    idleGcTimers.delete(doc.name)
    if (doc.conns.size === 0) {
      destroyDoc(doc)
    }
  }, yroomIdleMs)
  idleGcTimers.set(doc.name, timer)
}

const getYDoc = (docname, gc = true) => map.setIfUndefined(docs, docname, () => {
  const doc = new WSSharedDoc(docname)
  doc.gc = gc
  if (persistence !== null) {
    persistence.bindState(docname, doc)
  }
  docs.set(docname, doc)
  return doc
})

exports.getYDoc = getYDoc

/**
 * @param {any} conn
 * @param {WSSharedDoc} doc
 * @param {Uint8Array} message
 */
const messageListener = (conn, doc, message) => {
  try {
    const encoder = encoding.createEncoder()
    const decoder = decoding.createDecoder(message)
    const messageType = decoding.readVarUint(decoder)
    switch (messageType) {
      case messageSync: {
        // Read-only clients may only request state (SyncStep1). SyncStep2 and
        // Update would apply client-authored Yjs changes (edits + chat).
        if (conn.__vimtexReadOnly) {
          const syncType = decoding.readVarUint(decoder)
          if (syncType === syncProtocol.messageYjsSyncStep1) {
            encoding.writeVarUint(encoder, messageSync)
            syncProtocol.writeSyncStep2(encoder, doc, decoding.readVarUint8Array(decoder))
            if (encoding.length(encoder) > 1) {
              send(doc, conn, encoding.toUint8Array(encoder))
            }
          }
          break
        }
        encoding.writeVarUint(encoder, messageSync)
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn)

        // If the `encoder` only contains the type of reply message and no
        // message, there is no need to send the message. When `encoder` only
        // contains the type of reply, its length is 1.
        if (encoding.length(encoder) > 1) {
          send(doc, conn, encoding.toUint8Array(encoder))
        }
        break
      }
      case messageAwareness: {
        // Presence (name/caret) is allowed for view-only peers.
        awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), conn)
        break
      }
    }
  } catch (err) {
    console.error(err)
    doc.emit('error', [err])
  }
}

/**
 * @param {WSSharedDoc} doc
 * @param {any} conn
 */
const closeConn = (doc, conn) => {
  if (doc.conns.has(conn)) {
    /**
     * @type {Set<number>}
     */
    // @ts-ignore
    const controlledIds = doc.conns.get(conn)
    doc.conns.delete(conn)
    awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null)
    if (doc.conns.size === 0) {
      if (persistence !== null) {
        destroyDoc(doc)
      } else {
        scheduleIdleGc(doc)
      }
    }
  }
  conn.close()
}

/**
 * @param {WSSharedDoc} doc
 * @param {any} conn
 * @param {Uint8Array} m
 */
const send = (doc, conn, m) => {
  if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
    closeConn(doc, conn)
  }
  try {
    conn.send(m, /** @param {any} err */ err => { err != null && closeConn(doc, conn) })
  } catch (e) {
    closeConn(doc, conn)
  }
}

const pingTimeout = 30000

/**
 * @param {any} conn
 * @param {any} req
 * @param {any} opts
 */
exports.setupWSConnection = (conn, req, { docName = null, gc = true } = {}) => {
  conn.binaryType = 'arraybuffer'
  const rawUrl = typeof req.url === 'string' ? req.url : '/'
  let resolvedDocName = docName
  /** @type {URLSearchParams} */
  let searchParams
  try {
    const parsed = new URL(rawUrl, 'http://localhost')
    resolvedDocName = resolvedDocName ?? decodeURIComponent(parsed.pathname.replace(/^\//, ''))
    searchParams = parsed.searchParams
  } catch {
    resolvedDocName = resolvedDocName ?? rawUrl.slice(1).split('?')[0]
    searchParams = new URLSearchParams(rawUrl.includes('?') ? rawUrl.split('?')[1] : '')
  }
  if (!resolvedDocName) {
    conn.close()
    return
  }

  const meta = readRoomMeta(resolvedDocName)
  if (isRoomExpired(meta)) {
    console.warn('[vimtex] Rejected WS join — room expired', resolvedDocName)
    conn.close()
    return
  }
  if (meta?.passwordHash) {
    const auth = searchParams.get('auth')
    if (!verifyAuthToken(resolvedDocName, auth)) {
      console.warn('[vimtex] Rejected WS join — missing/invalid auth for room', resolvedDocName)
      conn.close()
      return
    }
  }

  const viewToken = searchParams.get('view')
  const editParam = searchParams.get('edit')

  if (viewToken) {
    if (!verifyViewToken(resolvedDocName, viewToken)) {
      console.warn('[vimtex] Rejected WS join with invalid view token for room', resolvedDocName)
      conn.close()
      return
    }
    conn.__vimtexReadOnly = true
  } else if (hasEditAcl(meta)) {
    // Guest ACL: writes require the opaque edit secret; bare room id is not enough.
    if (!verifyEditSecret(editParam, meta.editSecret)) {
      console.warn('[vimtex] Rejected WS join — missing/invalid edit capability for room', resolvedDocName)
      conn.close()
      return
    }
    conn.__vimtexReadOnly = false
  } else {
    // Legacy rooms (no editSecret yet): room id remains the edit capability.
    conn.__vimtexReadOnly = false
  }

  // get doc, initialize if it does not exist yet
  const doc = getYDoc(resolvedDocName, gc)
  cancelIdleGc(resolvedDocName)
  doc.conns.set(conn, new Set())
  // listen and reply to events
  conn.on('message', /** @param {ArrayBuffer} message */ message => messageListener(conn, doc, new Uint8Array(message)))

  // Check if connection is still alive
  let pongReceived = true
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.conns.has(conn)) {
        closeConn(doc, conn)
      }
      clearInterval(pingInterval)
    } else if (doc.conns.has(conn)) {
      pongReceived = false
      try {
        conn.ping()
      } catch (e) {
        closeConn(doc, conn)
        clearInterval(pingInterval)
      }
    }
  }, pingTimeout)
  conn.on('close', () => {
    closeConn(doc, conn)
    clearInterval(pingInterval)
  })
  conn.on('pong', () => {
    pongReceived = true
  })
  // put the following in a variables in a block so the interval handlers don't keep in in
  // scope
  {
    // send sync step 1
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeSyncStep1(encoder, doc)
    send(doc, conn, encoding.toUint8Array(encoder))
    const awarenessStates = doc.awareness.getStates()
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())))
      send(doc, conn, encoding.toUint8Array(encoder))
    }
  }
}
