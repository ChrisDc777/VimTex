import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { getCollabWsBase } from "@/lib/collab";
import type { RoomChatMessage } from "@/lib/room-chat";
import type { CollabStatus, CollabUser, PeerInfo } from "@/lib/types";

export type WorkspaceCallbacks = {
  onTextChange: (text: string) => void;
  onCollabStatus: (status: CollabStatus) => void;
  onPeersChange: (peers: PeerInfo[]) => void;
};

/** How long a peer's typing flag stays live after their last heartbeat. */
export const TYPING_TIMEOUT_MS = 4000;
/** Coalesce awareness churn (every cursor move) into slower peer emissions. */
const PEERS_EMIT_DEBOUNCE_MS = 120;

export type WorkspaceControllerOptions = {
  roomId: string;
  user: CollabUser;
  /** When true, connect WebSocket and sync with peers. Default true. */
  collaborationEnabled?: boolean;
  /**
   * When set, join as view-only: WS sends `view` param and local mutations
   * are blocked in the controller (server also refuses Yjs writes).
   */
  viewToken?: string | null;
  /**
   * Session auth token for password-protected rooms (`auth` WS query param).
   */
  authToken?: string | null;
  /** Local autosave seed when the buffer is empty (solo or pre-sync). */
  localSeed?: string | null;
  /** Seed inserted after first collab sync if the room is empty. */
  emptyRoomSeed?: string | null;
};

function setAwarenessUser(
  provider: WebsocketProvider,
  user: CollabUser,
): void {
  provider.awareness.setLocalStateField("user", {
    name: user.name,
    color: user.color,
    colorLight: user.colorLight,
    avatarUrl: user.avatarUrl ?? null,
  });
}

function readAwarenessUser(state: unknown): CollabUser | null {
  const s = state as { user?: Partial<CollabUser> } | undefined;
  const u = s?.user;
  if (!u || typeof u.name !== "string" || !u.name.trim()) return null;
  return {
    name: u.name.trim(),
    color: typeof u.color === "string" ? u.color : "var(--primary)",
    colorLight:
      typeof u.colorLight === "string" ? u.colorLight : "var(--primary)",
    avatarUrl: typeof u.avatarUrl === "string" ? u.avatarUrl : null,
  };
}

function readTypingAt(state: unknown): number | null {
  const s = state as { typing?: unknown } | undefined;
  return typeof s?.typing === "number" ? (s.typing as number) : null;
}

function isRoomChatMessage(m: unknown): m is RoomChatMessage {
  return (
    !!m &&
    typeof m === "object" &&
    typeof (m as RoomChatMessage).id === "string" &&
    typeof (m as RoomChatMessage).text === "string"
  );
}

/**
 * Owns the Yjs document buffer and room connection for one room:
 * the Y.Doc, the "codemirror" text, the "chat" array, the websocket
 * provider, awareness, and undo manager.
 *
 * Framework-agnostic (no React) so it is unit-testable and reusable from
 * any consumer (editor, chat, AI, presence). Attach callbacks via
 * `setCallbacks`; mutate the buffer via `transact`/`replaceAll`.
 */
export class WorkspaceController {
  readonly ydoc: Y.Doc;
  readonly ytext: Y.Text;
  readonly ychat: Y.Array<RoomChatMessage>;
  readonly provider: WebsocketProvider;
  readonly undoManager: Y.UndoManager;
  readonly collaborationEnabled: boolean;
  /** True when this client joined with a view-only capability token. */
  readonly readOnly: boolean;

  private callbacks: WorkspaceCallbacks = {
    onTextChange: () => {},
    onCollabStatus: () => {},
    onPeersChange: () => {},
  };
  private callbacksAttached = false;
  private collabStatus: CollabStatus;
  private peerCount = 1;
  private localSeed: string | null;
  private emptyRoomSeed: string | null;
  private seeded = false;
  private peers: PeerInfo[] = [];
  private peersDirty = false;
  private peersTimer: ReturnType<typeof setTimeout> | null = null;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private typingRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly textObserve: () => void;
  private readonly onStatus: (event: { status: string }) => void;
  private readonly onAwarenessChange: () => void;
  private readonly maybeSeed: (synced: boolean) => void;

  constructor(options: WorkspaceControllerOptions) {
    const {
      roomId,
      user,
      collaborationEnabled = true,
      viewToken = null,
      authToken = null,
    } = options;
    this.collaborationEnabled = collaborationEnabled;
    this.readOnly = Boolean(viewToken?.trim());
    this.localSeed = options.localSeed?.trim() ?? null;
    this.emptyRoomSeed = options.emptyRoomSeed?.trim() ?? null;

    this.ydoc = new Y.Doc();
    this.ytext = this.ydoc.getText("codemirror");
    this.ychat = this.ydoc.getArray<RoomChatMessage>("chat");

    const wsBase = getCollabWsBase();
    const params: Record<string, string> = {};
    const trimmedView = viewToken?.trim();
    if (trimmedView) params.view = trimmedView;
    const trimmedAuth = authToken?.trim();
    if (trimmedAuth) params.auth = trimmedAuth;
    this.provider = new WebsocketProvider(wsBase, roomId, this.ydoc, {
      connect: collaborationEnabled,
      params,
    });
    setAwarenessUser(this.provider, user);

    this.undoManager = new Y.UndoManager(this.ytext);

    this.textObserve = () => {
      this.callbacks.onTextChange(this.ytext.toString());
    };
    this.ytext.observe(this.textObserve);

    this.onStatus = (event: { status: string }) => {
      if (
        event.status === "connected" ||
        event.status === "disconnected" ||
        event.status === "connecting"
      ) {
        this.collabStatus = event.status;
        this.callbacks.onCollabStatus(event.status);
      }
    };
    this.onAwarenessChange = () => {
      this.scheduleEmitPeers();
    };

    this.maybeSeed = (synced: boolean) => {
      if (!synced || this.seeded) return;
      this.seeded = true;
      if (!this.readOnly && this.ytext.length === 0) {
        const seed = this.emptyRoomSeed || this.localSeed;
        if (seed) {
          this.ydoc.transact(() => {
            this.ytext.insert(0, seed);
          }, "seed");
          this.undoManager.clear();
        }
      }
      this.callbacks.onTextChange(this.ytext.toString());
    };

    if (collaborationEnabled) {
      this.collabStatus = "connecting";
      this.callbacks.onCollabStatus("connecting");
      this.provider.on("status", this.onStatus);
      this.provider.awareness.on("change", this.onAwarenessChange);
      this.scheduleEmitPeers();
      this.provider.on("sync", this.maybeSeed);
    } else {
      this.collabStatus = "local";
      this.callbacks.onCollabStatus("local");
      this.peerCount = 1;
      this.emitPeers();
      if (this.ytext.length === 0 && this.localSeed) {
        this.ydoc.transact(() => {
          this.ytext.insert(0, this.localSeed!);
        }, "local-seed");
        this.undoManager.clear();
      }
      this.callbacks.onTextChange(this.ytext.toString());
    }
  }

  /** Full document text (single source of truth). */
  getText(): string {
    return this.ytext.toString();
  }

  getClientId(): number {
    return this.ydoc.clientID;
  }

  getCollabStatus(): CollabStatus {
    return this.collabStatus;
  }

  getPeerCount(): number {
    return this.peerCount;
  }

  /** Latest known room occupants (includes the local user). */
  getPeers(): PeerInfo[] {
    return this.peers;
  }

  /**
   * Broadcast whether the local user is composing a chat message.
   *
   * Sets a timestamp in awareness so peers can show a "typing…" indicator.
   * Re-emitting while active refreshes the heartbeat; the flag auto-clears
   * after TYPING_TIMEOUT_MS so a crashed tab can't leave a ghost "typing".
   */
  publishTyping(active: boolean): void {
    if (this.collabStatus === "local") return;
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    if (active) {
      this.provider.awareness.setLocalStateField("typing", Date.now());
      this.typingTimer = setTimeout(() => {
        this.provider.awareness.setLocalStateField("typing", null);
      }, TYPING_TIMEOUT_MS);
    } else {
      this.provider.awareness.setLocalStateField("typing", null);
    }
  }

  /** Force the collab transport to re-establish (used by reconnect CTA). */
  reconnect(): void {
    this.provider.disconnect();
    this.provider.connect();
  }

  /**
   * Attach (or refresh) callbacks. On first attach, emits the current
   * text/status/peer values so late subscribers never miss state.
   */
  setCallbacks(callbacks: Partial<WorkspaceCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    if (this.callbacksAttached) return;
    this.callbacksAttached = true;
    this.callbacks.onTextChange(this.ytext.toString());
    this.callbacks.onCollabStatus(this.collabStatus);
    this.emitPeers();
  }

  /** Update the awareness user (e.g. display-name change). */
  setUser(user: CollabUser): void {
    setAwarenessUser(this.provider, user);
  }

  /**
   * Apply (or replace) the local autosave seed if the buffer is empty.
   *
   * In collab mode the seed is only applied after the first sync (via
   * `maybeSeed`), so a pre-sync insert cannot later be appended by the
   * server's copy of the same content.
   */
  setLocalSeed(seed: string | null): void {
    this.localSeed = seed?.trim() ?? null;
    if (this.readOnly || !this.localSeed || this.ytext.length > 0) return;
    if (this.collaborationEnabled && !this.seeded) return;
    this.ydoc.transact(() => {
      this.ytext.insert(0, this.localSeed!);
    }, "local-seed");
    this.undoManager.clear();
  }

  /** Run a mutation inside a Yjs transaction (undo-scoped by origin). */
  transact(fn: (ytext: Y.Text) => void, origin?: string): void {
    if (this.readOnly) return;
    this.ydoc.transact(() => fn(this.ytext), origin);
  }

  /** Replace the entire buffer (syncs to all peers). */
  replaceAll(content: string): void {
    if (this.readOnly) return;
    this.transact(
      (ytext) => {
        const len = ytext.length;
        if (len > 0) ytext.delete(0, len);
        if (content.length > 0) ytext.insert(0, content);
      },
      "ai-edit",
    );
  }

  /** Alias for replaceAll — used by room @ai edits. */
  applyAiEdit(content: string): void {
    this.replaceAll(content);
  }

  appendChatMessage(msg: RoomChatMessage): void {
    if (this.readOnly) return;
    this.ydoc.transact(() => {
      this.ychat.push([msg]);
    }, "chat");
  }

  /** Subscribe to the shared room chat array; returns unsubscribe. */
  subscribeChat(cb: (messages: RoomChatMessage[]) => void): () => void {
    const emit = () => cb(this.readChat());
    emit();
    this.ychat.observe(emit);
    return () => {
      this.ychat.unobserve(emit);
    };
  }

  private readChat(): RoomChatMessage[] {
    return this.ychat.toArray().filter(isRoomChatMessage);
  }

  /** Rebuild the peer list from awareness (user + typing), then emit. */
  private emitPeers(): void {
    const now = Date.now();
    const list: PeerInfo[] = [];
    this.provider.awareness.getStates().forEach((state, clientId) => {
      const user = readAwarenessUser(state);
      if (!user) return;
      const typingAt = readTypingAt(state);
      list.push({
        clientId,
        name: user.name,
        color: user.color,
        colorLight: user.colorLight,
        avatarUrl: user.avatarUrl,
        lastSeen: now,
        typing: typingAt != null && now - typingAt < TYPING_TIMEOUT_MS,
      });
    });
    list.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
    );
    this.peers = list;
    this.peerCount = list.length;
    this.callbacks.onPeersChange(list);

    // Re-check once the typing window lapses even if the typing peer goes
    // silent (or crashes) — otherwise their flag would linger until awareness GC.
    if (this.typingRefreshTimer) {
      clearTimeout(this.typingRefreshTimer);
      this.typingRefreshTimer = null;
    }
    if (list.some((peer) => peer.typing)) {
      this.typingRefreshTimer = setTimeout(() => {
        this.typingRefreshTimer = null;
        this.emitPeers();
      }, TYPING_TIMEOUT_MS);
    }
  }

  /** Debounce peer emission so cursor churn doesn't spam React state. */
  private scheduleEmitPeers(): void {
    if (this.peersDirty) return;
    this.peersDirty = true;
    this.peersTimer = setTimeout(() => {
      this.peersDirty = false;
      this.peersTimer = null;
      this.emitPeers();
    }, PEERS_EMIT_DEBOUNCE_MS);
  }

  destroy(): void {
    if (this.peersTimer) {
      clearTimeout(this.peersTimer);
      this.peersTimer = null;
    }
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    if (this.typingRefreshTimer) {
      clearTimeout(this.typingRefreshTimer);
      this.typingRefreshTimer = null;
    }
    this.ytext.unobserve(this.textObserve);
    if (this.collabStatus !== "local") {
      this.provider.off("status", this.onStatus);
      this.provider.awareness.off("change", this.onAwarenessChange);
    }
    this.provider.destroy();
    this.undoManager.destroy();
    this.ydoc.destroy();
  }
}
