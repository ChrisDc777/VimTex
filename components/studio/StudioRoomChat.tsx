"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { parseAssistantReply } from "@/lib/ai-chat";
import { postAiChat } from "@/lib/ai-client";
import {
  DEFAULT_AI_MODEL,
  type AiModelId,
} from "@/lib/ai-providers";
import {
  AI_MENTION_SUGGESTIONS,
  mentionsAi,
  stripAiMention,
} from "@/lib/chat-mentions";
import {
  formatRelativeTime,
  newChatMessageId,
  type RoomChatMessage,
} from "@/lib/room-chat";
import type { CollabUser, PeerInfo } from "@/lib/types";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { AvatarStack } from "@/components/presence/AvatarStack";
import { TypingIndicator } from "@/components/presence/TypingIndicator";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

export type StudioRoomChatProps = {
  /** When false, render nothing (legacy standalone aside). */
  open?: boolean;
  /** Render inner panel only — parent supplies sizing chrome (SidePanel). */
  embedded?: boolean;
  onClose: () => void;
  peers: PeerInfo[];
  selfClientId?: number | null;
  user: CollabUser;
  /** Bumps when the room is ready so chat can resubscribe. */
  chatReady: boolean;
};

function highlightMentions(text: string): ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /@(?:vimothy|ai|vimtex)\b/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      <span key={key++} className="font-semibold text-primary">
        {match[0]}
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}

export function StudioRoomChat({
  open = true,
  embedded = false,
  onClose,
  peers,
  selfClientId,
  user,
  chatReady,
}: StudioRoomChatProps) {
  const workspace = useWorkspace();
  const [model, setModel] = useState<AiModelId>(DEFAULT_AI_MODEL);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<RoomChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorForId, setErrorForId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [stickBottom, setStickBottom] = useState(true);
  const [currentClientId, setCurrentClientId] = useState<number | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingAiRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!chatReady) {
      setMessages([]);
      setCurrentClientId(null);
      return;
    }
    if (!workspace) return;
    setCurrentClientId(workspace.getClientId());
    return workspace.subscribeChat(setMessages);
  }, [chatReady, workspace]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !stickBottom) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, busy, open, stickBottom, error]);

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickBottom(dist < 48);
  };

  const filteredMentions = AI_MENTION_SUGGESTIONS.filter((s) =>
    s.startsWith(mentionFilter.toLowerCase()),
  );

  const updateMentionState = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const at = before.match(/(^|[\s])@([a-zA-Z0-9_]*)$/);
    if (at) {
      setMentionOpen(true);
      setMentionFilter(at[2] ?? "");
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
      setMentionFilter("");
    }
  };

  const insertMention = (tag: string) => {
    const el = inputRef.current;
    const value = input;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    const replaced = before.replace(/(^|[\s])@[a-zA-Z0-9_]*$/, `$1@${tag} `);
    const next = replaced + after;
    setInput(next);
    setMentionOpen(false);
    requestAnimationFrame(() => {
      const pos = replaced.length;
      el?.setSelectionRange(pos, pos);
      el?.focus();
    });
  };

  const invokeAi = useCallback(
    async (userMsg: RoomChatMessage) => {
      const ws = workspace;
      if (!ws) return;

      const instruction = stripAiMention(userMsg.text);
      if (!instruction) {
        setError("Add an instruction after @vimothy.");
        setErrorForId(userMsg.id);
        return;
      }

      pendingAiRef.current = userMsg.id;
      setBusy(true);
      setError(null);
      setErrorForId(null);

      try {
        const data = await postAiChat({
          instruction,
          document: ws.getText(),
          model,
        });

        const parsed = parseAssistantReply(data.message ?? "");
        const clientId = ws.getClientId() ?? userMsg.clientId;
        const aiMsg: RoomChatMessage = {
          id: newChatMessageId(),
          clientId,
          authorName: "Vimothy",
          authorColor: "var(--primary)",
          role: "ai",
          text: parsed.message,
          mentionAi: false,
          createdAt: Date.now(),
          documentEdit: parsed.documentEdit,
        };
        ws.appendChatMessage(aiMsg);
        if (parsed.documentEdit != null) {
          ws.applyAiEdit(parsed.documentEdit);
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Unknown error";
        setError(detail);
        setErrorForId(userMsg.id);
      } finally {
        pendingAiRef.current = null;
        setBusy(false);
      }
    },
    [workspace, model],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    const ws = workspace;
    if (!text || busy || !ws) return;

    const clientId = ws.getClientId();
    if (clientId == null) return;

    const mention = mentionsAi(text);
    const userMsg: RoomChatMessage = {
      id: newChatMessageId(),
      clientId,
      authorName: user.name,
      authorColor: user.color,
      role: "user",
      text,
      mentionAi: mention,
      createdAt: Date.now(),
    };

    setInput("");
    setMentionOpen(false);
    setError(null);
    setErrorForId(null);
    setStickBottom(true);
    workspace?.publishTyping(false);
    if (inputRef.current) {
      inputRef.current.style.height = "";
    }
    ws.appendChatMessage(userMsg);

    if (mention) {
      await invokeAi(userMsg);
    }
  }, [busy, workspace, input, invokeAi, user.color, user.name]);

  const retryAi = useCallback(
    (msg: RoomChatMessage) => {
      if (busy || !msg.mentionAi) return;
      void invokeAi(msg);
    },
    [busy, invokeAi],
  );

  if (!open) return null;

  const panel = (
    <>
      <div className="vt-chat-panel__header">
        <p className="vt-chat-panel__title">
          Chat <span>· {peers.length} online</span>
        </p>
        <AvatarStack
          peers={peers}
          selfClientId={selfClientId}
          max={3}
          size={22}
        />
        <button
          type="button"
          onClick={onClose}
          className="vt-chat-icon-btn"
          aria-label="Close chat"
        >
          ×
        </button>
      </div>

      <div
        ref={listRef}
        onScroll={onListScroll}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2.5 py-2"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs leading-relaxed text-mute">
              Message the room. Type @ to ask Vimothy.
            </p>
            {peers.length <= 1 ? (
              <p className="vt-chat-empty__waiting">
                You&apos;re the only one here — share the room link to invite
                teammates.
              </p>
            ) : null}
          </div>
        ) : null}        {messages.map((m, i) => {
          const isAi = m.role === "ai";
          const isSelf =
            !isAi &&
            ((currentClientId != null && m.clientId === currentClientId) ||
              m.authorName === user.name);
          const prev = messages[i - 1];
          const continued =
            !!prev &&
            prev.role === m.role &&
            prev.clientId === m.clientId &&
            prev.authorName === m.authorName &&
            m.createdAt - prev.createdAt < 120_000;
          const showError = error && errorForId === m.id;
          const msgClass = [
            "vt-chat-msg",
            continued ? "vt-chat-msg--continued" : "",
            isAi ? "vt-chat-msg--ai" : "",
            isSelf ? "vt-chat-msg--self" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <div key={m.id} className={msgClass}>
              {!continued ? (
                <div className="vt-chat-msg__meta">
                  <span
                    className="vt-chat-msg__author"
                    style={{ color: isAi ? "var(--primary)" : m.authorColor }}
                  >
                    {isAi ? "Vimothy" : isSelf ? "You" : m.authorName}
                  </span>
                  <span className="vt-chat-msg__time">
                    {formatRelativeTime(m.createdAt, now)}
                  </span>
                </div>
              ) : null}
              <div className="vt-chat-msg__body">
                {highlightMentions(m.text)}
              </div>
              {isAi && m.documentEdit != null ? (
                <p className="vt-chat-msg__hint">Applied to note</p>
              ) : null}
              {showError ? (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-body">{error}</p>
                  <button
                    type="button"
                    onClick={() => retryAi(m)}
                    disabled={busy}
                    className="vt-chat-icon-btn h-auto min-h-0 px-0 text-xs text-accent-breeze"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}

        {busy ? (
          <p className="vt-chat-msg__hint mt-2">Thinking…</p>
        ) : null}
      </div>

      <TypingIndicator
        typing={peers.filter((peer) => peer.typing)}
        selfClientId={selfClientId}
      />

      <ChatComposer
        input={input}
        busy={busy}
        model={model}
        inputRef={inputRef}
        mentionOpen={mentionOpen}
        filteredMentions={filteredMentions}
        mentionIndex={mentionIndex}
        onInputChange={(value, caret) => {
          setInput(value);
          updateMentionState(value, caret);
          workspace?.publishTyping(value.trim().length > 0);
        }}
        onModelChange={setModel}
        onSend={() => void send()}
        onMentionSelect={insertMention}
        onMentionIndexChange={setMentionIndex}
        onMentionClose={() => setMentionOpen(false)}
      />
    </>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col">{panel}</div>
    );
  }

  return (
    <aside
      className="vt-chat-panel flex h-[min(48vh,400px)] min-h-0 w-full shrink-0 flex-col border-t border-hairline bg-canvas/95 backdrop-blur-sm md:h-full md:w-[min(100%,340px)] md:border-t-0 md:border-l"
      aria-label="Room chat"
    >
      {panel}
    </aside>
  );
}
