import { DurableObject } from "cloudflare:workers";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { createHash, randomBytes } from "node:crypto";
import {
  authorizeRoom,
  createAuthToken,
  createEditSecret,
  createViewToken,
  hashEditSecret,
  hashPassword,
  parseCredentials,
  requireRoomSecret,
  verifyEditSecret,
  verifyPassword,
  type RoomCredentials,
} from "./auth";
import {
  CLOSE_EXPIRED,
  CLOSE_POLICY,
  CLOSE_RATE,
  CLOSE_TOO_LARGE,
  MAX_CONNECTIONS,
  MAX_MESSAGE_BYTES,
  MAX_SNAPSHOT_BYTES,
  MAX_YJS_STATE_BYTES,
  MESSAGE_RATE_MAX,
  MESSAGE_RATE_WINDOW_MS,
  PERSIST_DEBOUNCE_MS,
  PERSIST_MAX_WAIT_MS,
  PUBLIC_BETA_TTL_MS,
  logEvent,
} from "./constants";
import { json } from "./cors";
import {
  deleteAllSnapshots,
  deleteSnapshot,
  deleteYjsState,
  enforceSnapshotRetention,
  insertSnapshot,
  latestSnapshotMatches,
  listSnapshots,
  migrateSchema,
  querySnapshots,
  readMeta,
  readSnapshot,
  readYjsState,
  updateSnapshotMeta,
  upsertMeta,
  writeYjsState,
  type RoomMetaRow,
} from "./storage";
import { diffLines, summarizeDiff } from "./text-diff";
import {
  applyStoredState,
  createRoomDoc,
  decodeCodemirror,
  encodeAwarenessStates,
  encodeAwarenessUpdate,
  encodeCodemirror,
  encodeDoc,
  encodeDocUpdate,
  encodeSyncStep1,
  handleIncoming,
  restoreCodemirror,
  type SocketAttachment,
  type SocketRole,
} from "./yjs-protocol";

const TTL_PRESETS_MS: Record<string, number | null> = {
  never: null,
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": PUBLIC_BETA_TTL_MS,
};

type RateBucket = { count: number; resetAt: number };

export class RoomObject extends DurableObject<Env> {
  private doc: Y.Doc | null = null;
  private awareness: awarenessProtocol.Awareness | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private firstDirtyAt = 0;
  private persistInFlight: Promise<void> | null = null;
  private readonly rates = new WeakMap<WebSocket, RateBucket>();
  private schemaReady = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.ensureSchema();
    });
  }

  private ensureSchema(): void {
    if (this.schemaReady) return;
    migrateSchema(this.ctx.storage.sql);
    this.schemaReady = true;
  }

  private ttlNeverAllowed(): boolean {
    return this.env.TTL_NEVER_ALLOWED !== "false";
  }

  private defaultTtlMs(): number {
    const raw = Number(this.env.DEFAULT_TTL_MS || "0");
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }

  private roomIdFromRequest(request: Request): string {
    const url = new URL(request.url);
    const api = url.pathname.match(
      /^\/api\/rooms\/([a-zA-Z0-9_-]{4,64})(?:\/|$)/,
    );
    if (api?.[1]) return api[1];
    const ws = url.pathname.match(/^\/([a-zA-Z0-9_-]{4,64})$/);
    return ws?.[1] ?? "unknown";
  }

  private metaAuthShape(meta: RoomMetaRow | null): {
    expired: boolean;
    passwordHash: string | null;
    editSecretHash: string | null;
    editSecretLegacy: string | null;
  } {
    if (!meta) {
      return {
        expired: false,
        passwordHash: null,
        editSecretHash: null,
        editSecretLegacy: null,
      };
    }
    const expired =
      meta.expired ||
      (meta.expiresAt != null && meta.expiresAt <= Date.now());
    return {
      expired,
      passwordHash: meta.passwordHash,
      editSecretHash: meta.editSecretHash,
      editSecretLegacy: meta.editSecretLegacy,
    };
  }

  private ensureDoc(): Y.Doc {
    if (this.doc) return this.doc;
    const doc = createRoomDoc();
    applyStoredState(doc, readYjsState(this.ctx.storage.sql));
    const awareness = new awarenessProtocol.Awareness(doc);
    awareness.setLocalState(null);
    awareness.on(
      "update",
      ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
        const changed = added.concat(updated, removed);
        const payload = encodeAwarenessUpdate(awareness, changed);
        this.broadcast(payload, origin instanceof WebSocket ? origin : null);
        for (const ws of this.ctx.getWebSockets()) {
          const att = (ws.deserializeAttachment() || {}) as SocketAttachment;
          const ids = new Set(att.awarenessIds ?? []);
          for (const id of added) ids.add(id);
          for (const id of removed) ids.delete(id);
          ws.serializeAttachment({ ...att, awarenessIds: [...ids] });
        }
      },
    );
    doc.on("update", (update: Uint8Array, origin: unknown) => {
      this.broadcast(encodeDocUpdate(update), origin instanceof WebSocket ? origin : null);
      this.schedulePersist();
    });
    this.doc = doc;
    this.awareness = awareness;
    return doc;
  }

  private schedulePersist(): void {
    const now = Date.now();
    if (!this.firstDirtyAt) this.firstDirtyAt = now;
    const wait = Math.min(
      PERSIST_DEBOUNCE_MS,
      Math.max(0, PERSIST_MAX_WAIT_MS - (now - this.firstDirtyAt)),
    );
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      void this.flush();
    }, wait);
  }

  private async flush(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.persistInFlight) return this.persistInFlight;
    const doc = this.doc;
    if (!doc) return;
    this.persistInFlight = this.ctx.blockConcurrencyWhile(async () => {
      const update = encodeDoc(doc);
      if (update.byteLength > MAX_YJS_STATE_BYTES) {
        logEvent("vimtex.room.persist", {
          ok: false,
          reason: "too_large",
          bytes: update.byteLength,
        });
        throw new Error(
          "Room document is too large. Export and shorten the note, then try again.",
        );
      }
      writeYjsState(this.ctx.storage.sql, update);
      this.firstDirtyAt = 0;
      logEvent("vimtex.room.persist", { ok: true, bytes: update.byteLength });
    });
    try {
      await this.persistInFlight;
    } finally {
      this.persistInFlight = null;
    }
  }

  private broadcast(message: Uint8Array, except: WebSocket | null): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try {
        ws.send(message);
      } catch {
        try {
          ws.close(CLOSE_POLICY, "send failed");
        } catch {
          // ignore
        }
      }
    }
  }

  private authorize(
    roomId: string,
    creds: RoomCredentials,
    mode: "read" | "write" | "ws",
  ) {
    const secret = requireRoomSecret(this.env);
    return authorizeRoom(
      roomId,
      creds,
      this.metaAuthShape(readMeta(this.ctx.storage.sql)),
      secret,
      mode,
    );
  }

  async fetch(request: Request): Promise<Response> {
    try {
      requireRoomSecret(this.env);
    } catch {
      return json(this.env, request, { error: "ROOM_SECRET is not configured." }, 503);
    }
    this.ensureSchema();
    const url = new URL(request.url);
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleUpgrade(request, url);
    }
    return this.handleHttp(request, url);
  }

  async alarm(): Promise<void> {
    this.ensureSchema();
    try {
      await this.flush();
    } catch {
      logEvent("vimtex.room.alarm", { ok: false, reason: "flush" });
    }
    const meta = readMeta(this.ctx.storage.sql);
    if (!meta) return;
    if (meta.expiresAt && meta.expiresAt <= Date.now() && !meta.expired) {
      deleteYjsState(this.ctx.storage.sql);
      deleteAllSnapshots(this.ctx.storage.sql);
      upsertMeta(this.ctx.storage.sql, { expired: true });
      for (const ws of this.ctx.getWebSockets()) {
        try {
          ws.close(CLOSE_EXPIRED, "room expired");
        } catch {
          // ignore
        }
      }
      if (this.doc) {
        this.doc.destroy();
        this.doc = null;
        this.awareness = null;
      }
      logEvent("vimtex.room.expired", { ok: true });
      return;
    }
    if (meta.expiresAt && meta.expiresAt > Date.now()) {
      await this.ctx.storage.setAlarm(meta.expiresAt);
    }
  }

  async webSocketMessage(
    ws: WebSocket,
    message: ArrayBuffer | string,
  ): Promise<void> {
    const att = (ws.deserializeAttachment() || {}) as SocketAttachment;
    const role = att.role || "legacy";
    if (typeof message === "string") {
      ws.close(CLOSE_POLICY, "binary required");
      return;
    }
    const bytes = new Uint8Array(message);
    if (bytes.byteLength > MAX_MESSAGE_BYTES) {
      ws.close(CLOSE_TOO_LARGE, "message too large");
      return;
    }
    const now = Date.now();
    const bucket = this.rates.get(ws) ?? { count: 0, resetAt: now + MESSAGE_RATE_WINDOW_MS };
    if (now >= bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + MESSAGE_RATE_WINDOW_MS;
    }
    bucket.count += 1;
    this.rates.set(ws, bucket);
    if (bucket.count > MESSAGE_RATE_MAX) {
      ws.close(CLOSE_RATE, "rate limit");
      return;
    }
    const doc = this.ensureDoc();
    const awareness = this.awareness!;
    try {
      const reply = handleIncoming(doc, awareness, bytes, role);
      if (reply) ws.send(reply);
    } catch (err) {
      logEvent("vimtex.ws.message", {
        ok: false,
        reason: err instanceof Error ? err.name : "error",
      });
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const att = (ws.deserializeAttachment() || {}) as SocketAttachment;
    if (this.awareness && att.awarenessIds?.length) {
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        att.awarenessIds,
        null,
      );
    }
    try {
      await this.flush();
    } catch {
      // ignore
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try {
      ws.close(CLOSE_POLICY, "socket error");
    } catch {
      // ignore
    }
  }

  private handleUpgrade(request: Request, url: URL): Response {
    const roomId = this.roomIdFromRequest(request);
    const origin = request.headers.get("Origin");
    if (origin && !this.originOk(origin)) {
      return json(this.env, request, { error: "Origin not allowed." }, 403);
    }
    const creds = parseCredentials(request, url);
    const auth = this.authorize(roomId, creds, "ws");
    if (!auth.ok) {
      return json(this.env, request, { error: auth.error }, auth.status === 410 ? 410 : 401);
    }
    const sockets = this.ctx.getWebSockets();
    if (sockets.length >= MAX_CONNECTIONS) {
      return json(this.env, request, { error: "Room is full." }, 503);
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const role: SocketRole =
      auth.role === "view" ? "view" : auth.role === "edit" ? "edit" : "legacy";
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role, awarenessIds: [] } satisfies SocketAttachment);
    const doc = this.ensureDoc();
    server.send(encodeSyncStep1(doc));
    const awarenessMsg = this.awareness
      ? encodeAwarenessStates(this.awareness)
      : null;
    if (awarenessMsg) server.send(awarenessMsg);
    logEvent("vimtex.ws.open", { role, connections: sockets.length + 1 });
    return new Response(null, { status: 101, webSocket: client });
  }

  private originOk(origin: string): boolean {
    const allowed = (this.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return allowed.includes(origin);
  }

  private async handleHttp(request: Request, url: URL): Promise<Response> {
    const roomId = this.roomIdFromRequest(request);
    const rest =
      url.pathname.replace(/^\/api\/rooms\/[^/]+\/?/, "") || "";
    const parts = rest.split("/").filter(Boolean);
    const creds = parseCredentials(request, url);

    if (request.method === "POST" && parts[0] === "internal" && parts[1] === "bootstrap") {
      return this.bootstrap(request, roomId);
    }
    if (request.method === "POST" && parts[0] === "internal" && parts[1] === "export" && parts[2]) {
      return this.exportSnapshot(request, roomId, parts[2], creds);
    }

    try {
      if (parts[0] === "meta" && request.method === "GET") {
        return this.getMeta(request, roomId);
      }
      if (parts[0] === "meta" && request.method === "PATCH") {
        return this.patchMeta(request, roomId, creds);
      }
      if (parts[0] === "unlock" && request.method === "POST") {
        return this.unlock(request, roomId);
      }
      if (parts[0] === "capabilities" && request.method === "GET") {
        return this.getCapabilities(request, roomId);
      }
      if (parts[0] === "capabilities" && request.method === "POST") {
        return this.postCapabilities(request, roomId, creds);
      }
      if (parts[0] === "view-token") {
        return json(
          this.env,
          request,
          {
            error:
              "View tokens are no longer minted from GET /view-token. Use POST /capabilities with includeViewToken.",
            roomId,
          },
          410,
        );
      }
      if (parts[0] === "snapshots" && parts.length === 1 && request.method === "GET") {
        return this.listSnaps(request, url, roomId, creds);
      }
      if (parts[0] === "snapshots" && parts.length === 1 && request.method === "POST") {
        return this.createSnap(request, roomId, creds);
      }
      if (parts[0] === "snapshots" && parts[1] && parts[2] === "diff" && request.method === "POST") {
        return this.diffSnap(request, url, roomId, parts[1], creds);
      }
      if (parts[0] === "snapshots" && parts[1] && parts[2] === "fork") {
        return json(this.env, request, { error: "Fork is handled by the Worker." }, 400);
      }
      if (parts[0] === "snapshots" && parts[1] && request.method === "GET") {
        return this.getSnap(request, roomId, parts[1], creds);
      }
      if (parts[0] === "snapshots" && parts[1] && request.method === "POST") {
        return this.restoreSnap(request, url, roomId, parts[1], creds);
      }
      if (parts[0] === "snapshots" && parts[1] && request.method === "PATCH") {
        return this.patchSnap(request, roomId, parts[1], creds);
      }
      if (parts[0] === "snapshots" && parts[1] && request.method === "DELETE") {
        return this.deleteSnap(request, roomId, parts[1], creds);
      }
      return json(this.env, request, { error: "Not found." }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Room error";
      if (message.includes("too large") || message.includes("Export and shorten")) {
        return json(this.env, request, { error: message }, 413);
      }
      logEvent("vimtex.http.error", { path: parts.join("/") });
      return json(this.env, request, { error: "Internal room error." }, 500);
    }
  }

  private getMeta(request: Request, roomId: string): Response {
    const meta = readMeta(this.ctx.storage.sql);
    const expired =
      Boolean(meta?.expired) ||
      (meta?.expiresAt != null && meta.expiresAt <= Date.now());
    return json(this.env, request, {
      roomId,
      requiresPassword: Boolean(meta?.passwordHash),
      hasEditAcl: Boolean(meta?.editSecretHash || meta?.editSecretLegacy),
      expiresAt: meta?.expiresAt ?? null,
      expired,
      createdAt: meta?.createdAt ?? null,
      ttlNeverAllowed: this.ttlNeverAllowed(),
    });
  }

  private async patchMeta(
    request: Request,
    roomId: string,
    creds: RoomCredentials,
  ): Promise<Response> {
    const auth = this.authorize(roomId, creds, "write");
    if (!auth.ok) return json(this.env, request, { error: auth.error }, auth.status);
    let body: {
      password?: string | null;
      clearPassword?: boolean;
      ttl?: string | null;
      expiresAt?: number | null;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json(this.env, request, { error: "Invalid JSON body." }, 400);
    }
    const patch: Partial<RoomMetaRow> = {};
    if (body.clearPassword) {
      patch.passwordHash = null;
    } else if (typeof body.password === "string") {
      const trimmed = body.password.trim();
      if (trimmed.length < 4 || trimmed.length > 128) {
        return json(this.env, request, { error: "Password must be 4–128 characters." }, 400);
      }
      patch.passwordHash = hashPassword(trimmed);
    }
    if (body.ttl != null && body.ttl !== "") {
      if (!(body.ttl in TTL_PRESETS_MS)) {
        return json(this.env, request, { error: "Unknown ttl preset." }, 400);
      }
      if (body.ttl === "never" && !this.ttlNeverAllowed()) {
        return json(
          this.env,
          request,
          { error: "This deployment does not allow rooms without expiry." },
          400,
        );
      }
      const ms = TTL_PRESETS_MS[body.ttl]!;
      patch.expiresAt = ms == null ? null : Date.now() + ms;
    } else if (body.expiresAt !== undefined) {
      patch.expiresAt = body.expiresAt;
    }
    if (Object.keys(patch).length === 0) {
      return json(this.env, request, { error: "No password or ttl changes provided." }, 400);
    }
    const meta = upsertMeta(this.ctx.storage.sql, patch);
    if (meta.expiresAt) await this.ctx.storage.setAlarm(meta.expiresAt);
    const authToken =
      patch.passwordHash && !body.clearPassword
        ? createAuthToken(roomId, requireRoomSecret(this.env))
        : undefined;
    return json(this.env, request, {
      roomId,
      requiresPassword: Boolean(meta.passwordHash),
      expiresAt: meta.expiresAt,
      expired: meta.expired,
      authToken,
      ttlNeverAllowed: this.ttlNeverAllowed(),
    });
  }

  private async unlock(request: Request, roomId: string): Promise<Response> {
    const meta = readMeta(this.ctx.storage.sql);
    const shape = this.metaAuthShape(meta);
    if (shape.expired) {
      return json(this.env, request, { error: "This room has expired." }, 410);
    }
    if (!meta?.passwordHash) {
      return json(this.env, request, { authToken: null, requiresPassword: false });
    }
    let body: { password?: string };
    try {
      body = (await request.json()) as { password?: string };
    } catch {
      return json(this.env, request, { error: "Invalid JSON body." }, 400);
    }
    if (!verifyPassword(body.password ?? "", meta.passwordHash)) {
      return json(this.env, request, { error: "Incorrect password." }, 401);
    }
    return json(this.env, request, {
      authToken: createAuthToken(roomId, requireRoomSecret(this.env)),
      requiresPassword: true,
    });
  }

  private getCapabilities(request: Request, roomId: string): Response {
    const meta = readMeta(this.ctx.storage.sql);
    const shape = this.metaAuthShape(meta);
    return json(this.env, request, {
      roomId,
      hasEditAcl: Boolean(shape.editSecretHash || shape.editSecretLegacy),
      requiresPassword: Boolean(shape.passwordHash),
      expired: shape.expired,
    });
  }

  private async postCapabilities(
    request: Request,
    roomId: string,
    creds: RoomCredentials,
  ): Promise<Response> {
    const meta = readMeta(this.ctx.storage.sql);
    const shape = this.metaAuthShape(meta);
    if (shape.expired) {
      return json(this.env, request, { error: "This room has expired." }, 410);
    }
    let body: { edit?: string | null; includeViewToken?: boolean } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      // empty ok
    }
    const presented =
      typeof body.edit === "string" && body.edit.trim()
        ? body.edit.trim()
        : creds.edit;
    let stored = shape.editSecretHash || shape.editSecretLegacy;
    let editForClient = presented ?? "";
    let upgraded = false;
    if (!stored) {
      const edit = createEditSecret();
      const defaultTtl = this.defaultTtlMs();
      upsertMeta(this.ctx.storage.sql, {
        editSecretHash: hashEditSecret(edit),
        editSecretLegacy: null,
        expiresAt:
          meta?.expiresAt ?? (defaultTtl > 0 ? Date.now() + defaultTtl : null),
      });
      const next = readMeta(this.ctx.storage.sql);
      if (next?.expiresAt) await this.ctx.storage.setAlarm(next.expiresAt);
      editForClient = edit;
      upgraded = true;
    } else {
      if (!verifyEditSecret(presented, stored)) {
        return json(
          this.env,
          request,
          {
            error:
              "Edit capability required. Open an edit link or share from a tab that already has edit access.",
            hasEditAcl: true,
          },
          403,
        );
      }
      editForClient = presented!;
    }
    const payload: Record<string, unknown> = {
      roomId,
      edit: editForClient,
      hasEditAcl: true,
      upgraded,
    };
    if (body.includeViewToken) {
      payload.viewToken = createViewToken(roomId, requireRoomSecret(this.env));
    }
    return json(this.env, request, payload);
  }

  private listSnaps(
    request: Request,
    url: URL,
    roomId: string,
    creds: RoomCredentials,
  ): Response {
    const auth = this.authorize(roomId, creds, "read");
    if (!auth.ok) return json(this.env, request, { error: auth.error }, auth.status);
    const q = url.searchParams.get("q") ?? "";
    const limitRaw = url.searchParams.get("limit");
    const offsetRaw = url.searchParams.get("offset");
    const wantsPage =
      limitRaw != null || offsetRaw != null || q.trim().length > 0;
    if (!wantsPage) {
      return json(this.env, request, {
        snapshots: listSnapshots(this.ctx.storage.sql).map((s) =>
          this.snapshotJson(roomId, s),
        ),
      });
    }
    const page = querySnapshots(this.ctx.storage.sql, {
      q,
      limit: limitRaw != null ? Number(limitRaw) : 50,
      offset: offsetRaw != null ? Number(offsetRaw) : 0,
    });
    return json(this.env, request, {
      ...page,
      snapshots: page.snapshots.map((s) => this.snapshotJson(roomId, s as never)),
    });
  }

  private async createSnap(
    request: Request,
    roomId: string,
    creds: RoomCredentials,
  ): Promise<Response> {
    const auth = this.authorize(roomId, creds, "write");
    if (!auth.ok) return json(this.env, request, { error: auth.error }, auth.status);
    let label = "";
    let text: string | undefined;
    let kind: string | undefined;
    let createdBy: { name?: string; clientId?: number } | undefined;
    try {
      const body = (await request.json()) as {
        label?: string;
        text?: string;
        kind?: string;
        createdBy?: { name?: string; clientId?: number };
      };
      if (typeof body.label === "string") label = body.label;
      if (typeof body.text === "string") text = body.text;
      if (typeof body.kind === "string") kind = body.kind;
      if (body.createdBy && typeof body.createdBy === "object") {
        createdBy = body.createdBy;
      }
    } catch {
      // empty ok
    }
    const doc = this.ensureDoc();
    const update =
      typeof text === "string" ? encodeCodemirror(text) : encodeDoc(doc);
    if (update.byteLength > MAX_SNAPSHOT_BYTES) {
      return json(
        this.env,
        request,
        { error: "Checkpoint is too large. Export and shorten the note." },
        413,
      );
    }
    try {
      const snap = this.writeSnapshot(roomId, update, label, {
        kind,
        createdBy,
      });
      return json(this.env, request, { snapshot: snap }, 201);
    } catch (err) {
      return json(
        this.env,
        request,
        { error: err instanceof Error ? err.message : "Could not save checkpoint." },
        507,
      );
    }
  }

  private getSnap(
    request: Request,
    roomId: string,
    snapId: string,
    creds: RoomCredentials,
  ): Response {
    const auth = this.authorize(roomId, creds, "read");
    if (!auth.ok) return json(this.env, request, { error: auth.error }, auth.status);
    const snap = readSnapshot(this.ctx.storage.sql, snapId);
    if (!snap) return json(this.env, request, { error: "Snapshot not found." }, 404);
    const text = decodeCodemirror(new Uint8Array(snap.update));
    return json(this.env, request, {
      meta: this.snapshotJson(roomId, snap),
      text,
      length: text.length,
    });
  }

  private async restoreSnap(
    request: Request,
    url: URL,
    roomId: string,
    snapId: string,
    creds: RoomCredentials,
  ): Promise<Response> {
    const auth = this.authorize(roomId, creds, "write");
    if (!auth.ok) return json(this.env, request, { error: auth.error }, auth.status);
    const action = url.searchParams.get("action") || "restore";
    if (action === "delete") {
      if (!readSnapshot(this.ctx.storage.sql, snapId)) {
        return json(this.env, request, { error: "Snapshot not found." }, 404);
      }
      deleteSnapshot(this.ctx.storage.sql, snapId);
      return json(this.env, request, {
        ok: true,
        snapshots: listSnapshots(this.ctx.storage.sql).map((s) =>
          this.snapshotJson(roomId, s),
        ),
      });
    }
    let checkpointCurrent = false;
    let currentText: string | undefined;
    try {
      const body = (await request.json()) as {
        checkpointCurrent?: boolean;
        currentText?: string;
      };
      checkpointCurrent = Boolean(body.checkpointCurrent);
      if (typeof body.currentText === "string") currentText = body.currentText;
    } catch {
      // empty ok
    }
    const snap = readSnapshot(this.ctx.storage.sql, snapId);
    if (!snap) return json(this.env, request, { error: "Snapshot not found." }, 404);
    const doc = this.ensureDoc();
    if (checkpointCurrent) {
      const pre = typeof currentText === "string" ? currentText : doc.getText("codemirror").toString();
      this.writeSnapshot(roomId, encodeCodemirror(pre), "Pre-restore checkpoint", {
        kind: "pre_restore",
        skipDedupe: true,
      });
    }
    const restoredText = decodeCodemirror(new Uint8Array(snap.update));
    restoreCodemirror(doc, restoredText);
    await this.flush();
    logEvent("vimtex.snapshot", {
      action: "restore",
      snapId,
      charLength: restoredText.length,
      byteLength: snap.byteLength,
    });
    return json(this.env, request, {
      ok: true,
      text: restoredText,
      length: restoredText.length,
      applied: true,
    });
  }

  private async patchSnap(
    request: Request,
    roomId: string,
    snapId: string,
    creds: RoomCredentials,
  ): Promise<Response> {
    const auth = this.authorize(roomId, creds, "write");
    if (!auth.ok) return json(this.env, request, { error: auth.error }, auth.status);
    let label: string | undefined;
    let pinned: boolean | undefined;
    try {
      const body = (await request.json()) as { label?: unknown; pinned?: unknown };
      if (typeof body.label === "string") label = body.label;
      if (typeof body.pinned === "boolean") pinned = body.pinned;
    } catch {
      return json(this.env, request, { error: "Invalid JSON body." }, 400);
    }
    if (label === undefined && pinned === undefined) {
      return json(this.env, request, { error: "Provide label and/or pinned." }, 400);
    }
    const meta = updateSnapshotMeta(this.ctx.storage.sql, snapId, { label, pinned });
    if (!meta) return json(this.env, request, { error: "Snapshot not found." }, 404);
    return json(this.env, request, { snapshot: this.snapshotJson(roomId, meta) });
  }

  private deleteSnap(
    request: Request,
    roomId: string,
    snapId: string,
    creds: RoomCredentials,
  ): Response {
    const auth = this.authorize(roomId, creds, "write");
    if (!auth.ok) return json(this.env, request, { error: auth.error }, auth.status);
    if (!readSnapshot(this.ctx.storage.sql, snapId)) {
      return json(this.env, request, { error: "Snapshot not found." }, 404);
    }
    deleteSnapshot(this.ctx.storage.sql, snapId);
    return json(this.env, request, { ok: true });
  }

  private async diffSnap(
    request: Request,
    url: URL,
    roomId: string,
    snapId: string,
    creds: RoomCredentials,
  ): Promise<Response> {
    const auth = this.authorize(roomId, creds, "read");
    if (!auth.ok) return json(this.env, request, { error: auth.error }, auth.status);
    const snap = readSnapshot(this.ctx.storage.sql, snapId);
    if (!snap) return json(this.env, request, { error: "Snapshot not found." }, 404);
    const snapText = decodeCodemirror(new Uint8Array(snap.update));
    const against = url.searchParams.get("against") || "live";
    let compareText = "";
    if (against === "live") {
      let body: { liveText?: string };
      try {
        body = (await request.json()) as { liveText?: string };
      } catch {
        return json(this.env, request, { error: "liveText required." }, 400);
      }
      if (typeof body.liveText !== "string") {
        return json(this.env, request, { error: "liveText required." }, 400);
      }
      compareText = body.liveText;
    } else {
      const other = readSnapshot(this.ctx.storage.sql, against);
      if (!other) {
        return json(this.env, request, { error: "Comparison snapshot not found." }, 404);
      }
      compareText = decodeCodemirror(new Uint8Array(other.update));
    }
    const before = against === "live" ? snapText : compareText;
    const after = against === "live" ? compareText : snapText;
    const lines = diffLines(before, after);
    const summary = summarizeDiff(lines);
    const truncated = lines.length > 500;
    return json(this.env, request, {
      summary: { ...summary, truncated },
      lines: truncated ? undefined : lines,
    });
  }

  private exportSnapshot(
    request: Request,
    roomId: string,
    snapId: string,
    creds: RoomCredentials,
  ): Response {
    const auth = this.authorize(roomId, creds, "write");
    if (!auth.ok) return json(this.env, request, { error: auth.error }, auth.status);
    const snap = readSnapshot(this.ctx.storage.sql, snapId);
    if (!snap) return json(this.env, request, { error: "Snapshot not found." }, 404);
    const text = decodeCodemirror(new Uint8Array(snap.update));
    return json(this.env, request, {
      text,
      length: text.length,
      meta: this.snapshotJson(roomId, snap),
    });
  }

  private async bootstrap(request: Request, roomId: string): Promise<Response> {
    const secret = this.env.AI_ADMISSION_SECRET?.trim() || requireRoomSecret(this.env);
    if (request.headers.get("x-vimtex-internal")?.trim() !== secret) {
      return json(this.env, request, { error: "Unauthorized." }, 401);
    }
    const body = (await request.json()) as {
      editSecretHash?: string;
      updateBase64?: string;
      snapshot?: { label?: string; kind?: string };
      expiresAt?: number | null;
    };
    if (!body.editSecretHash || !body.updateBase64) {
      return json(this.env, request, { error: "editSecretHash and updateBase64 required." }, 400);
    }
    const update = Uint8Array.from(atob(body.updateBase64), (c) => c.charCodeAt(0));
    const defaultTtl = this.defaultTtlMs();
    upsertMeta(this.ctx.storage.sql, {
      editSecretHash: body.editSecretHash,
      editSecretLegacy: null,
      expiresAt:
        body.expiresAt !== undefined
          ? body.expiresAt
          : defaultTtl > 0
            ? Date.now() + defaultTtl
            : null,
    });
    const next = readMeta(this.ctx.storage.sql);
    if (next?.expiresAt) await this.ctx.storage.setAlarm(next.expiresAt);
    const doc = this.ensureDoc();
    Y.applyUpdate(doc, update);
    await this.flush();
    const snap = this.writeSnapshot(roomId, update, body.snapshot?.label || "Forked", {
      kind: body.snapshot?.kind || "named",
      skipDedupe: true,
    });
    return json(this.env, request, { ok: true, snapshot: snap }, 201);
  }

  private writeSnapshot(
    roomId: string,
    update: Uint8Array,
    label: string,
    opts: {
      kind?: string;
      createdBy?: { name?: string; clientId?: number };
      skipDedupe?: boolean;
    } = {},
  ) {
    const text = decodeCodemirror(update);
    const contentHash = createHash("sha256")
      .update(text, "utf8")
      .digest("hex")
      .slice(0, 16);
    if (!opts.skipDedupe) {
      const latest = latestSnapshotMatches(this.ctx.storage.sql, contentHash);
      if (latest) return this.snapshotJson(roomId, latest);
    }
    const id = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
    const row = {
      id,
      label: (label || "").trim().slice(0, 80) || `Checkpoint ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      byteLength: update.byteLength,
      kind: opts.kind || "manual",
      contentHash,
      charLength: text.length,
      createdByName: opts.createdBy?.name ?? null,
      createdByClientId: opts.createdBy?.clientId ?? null,
      pinned: false,
      update,
    };
    insertSnapshot(this.ctx.storage.sql, row);
    enforceSnapshotRetention(this.ctx.storage.sql);
    logEvent("vimtex.snapshot", {
      action: "create",
      snapId: id,
      kind: row.kind,
      charLength: row.charLength,
      byteLength: row.byteLength,
    });
    const stored = readSnapshot(this.ctx.storage.sql, id) ?? { ...row, update: update.buffer };
    return this.snapshotJson(roomId, stored);
  }

  private snapshotJson(
    roomId: string,
    snap: {
      id: string;
      label: string;
      createdAt: number;
      byteLength: number;
      kind: string | null;
      contentHash: string | null;
      charLength: number | null;
      createdByName?: string | null;
      createdByClientId?: number | null;
      pinned: boolean;
    },
  ) {
    return {
      id: snap.id,
      roomId,
      label: snap.label,
      createdAt: snap.createdAt,
      byteLength: snap.byteLength,
      kind: snap.kind || undefined,
      contentHash: snap.contentHash || undefined,
      charLength: snap.charLength ?? undefined,
      pinned: snap.pinned,
      ...(snap.createdByName || snap.createdByClientId
        ? {
            createdBy: {
              name: snap.createdByName || undefined,
              clientId: snap.createdByClientId || undefined,
            },
          }
        : {}),
    };
  }
}
