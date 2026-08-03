"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { parseAssistantReply } from "@/lib/ai-chat";
import { postAiChat } from "@/lib/ai-client";
import { DEFAULT_AI_MODEL, type AiModelId } from "@/lib/ai-providers";
import {
  AI_MENTION_SUGGESTIONS,
  mentionsAi,
  stripAiMention,
} from "@/lib/chat-mentions";
import { loadChatModel, saveChatModel } from "@/lib/chat-model-storage";
import {
  newChatMessageId,
  type RoomChatMessage,
} from "@/lib/room-chat";
import type { CollabUser, PeerInfo } from "@/lib/types";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { CloseIcon } from "@/components/chat/icons";
import { AvatarStack } from "@/components/presence/AvatarStack";
import { TypingIndicator } from "@/components/presence/TypingIndicator";
import { SidePanelHeader } from "@/components/SidePanelHeader";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

export type RoomChatSidebarProps = {
  open: boolean;
  onClose: () => void;
  peers: PeerInfo[];
  selfClientId?: number | null;
  user: CollabUser;
  /** Bumps when the room is ready so chat can resubscribe. */
  chatReady: boolean;
};

export function RoomChatSidebar({
  open,
  onClose,
  peers,
  selfClientId,
  user,
  chatReady,
}: RoomChatSidebarProps) {
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
    setModel(loadChatModel());
  }, []);

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

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setStickBottom(true);
  }, []);

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

  const insertSuggestion = (text: string) => {
    setInput(text);
    setMentionOpen(false);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.setSelectionRange(text.length, text.length);
    });
  };

  const handleModelChange = (next: AiModelId) => {
    setModel(next);
    saveChatModel(next);
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidePanelHeader
        title="Chat"
        meta={
          <>
            <AvatarStack
              peers={peers}
              selfClientId={selfClientId}
              max={3}
              size={22}
            />
            <span>{peers.length} online</span>
          </>
        }
        actions={
          <button
            type="button"
            onClick={onClose}
            className="vt-panel-header__icon-btn"
            aria-label="Close chat"
          >
            <CloseIcon />
          </button>
        }
      />

      <ChatMessageList
        messages={messages}
        currentClientId={currentClientId}
        currentUserName={user.name}
        now={now}
        busy={busy}
        error={error}
        errorForId={errorForId}
        listRef={listRef}
        onScroll={onListScroll}
        onRetry={retryAi}
        onSuggestion={insertSuggestion}
        stickBottom={stickBottom}
        onScrollToBottom={scrollToBottom}
        peerCount={peers.length}
      />

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
        onModelChange={handleModelChange}
        onSend={() => void send()}
        onMentionSelect={insertMention}
        onMentionIndexChange={setMentionIndex}
        onMentionClose={() => setMentionOpen(false)}
      />
    </div>
  );
}
