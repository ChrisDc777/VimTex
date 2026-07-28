"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { parseAssistantReply } from "@/lib/ai-chat";
import { DEFAULT_AI_MODEL, type AiModelId } from "@/lib/ai-models";
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
import type { CollabUser } from "@/lib/types";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { CloseIcon } from "@/components/chat/icons";
import { SidePanelHeader } from "@/components/SidePanelHeader";
import type { VimEditorHandle } from "@/components/VimEditor";

export type RoomChatSidebarProps = {
  open: boolean;
  onClose: () => void;
  peerCount: number;
  user: CollabUser;
  editorRef: RefObject<VimEditorHandle | null>;
  /** Bumps when the editor remounts (e.g. room ready) so chat can resubscribe. */
  chatReady: boolean;
};

export function RoomChatSidebar({
  open,
  onClose,
  peerCount,
  user,
  editorRef,
  chatReady,
}: RoomChatSidebarProps) {
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

    let unsub: (() => void) | undefined;
    let cancelled = false;
    let tries = 0;
    let raf = 0;

    const trySub = () => {
      if (cancelled) return;
      const editor = editorRef.current;
      if (!editor || editor.getClientId() == null) {
        if (tries++ < 60) {
          raf = requestAnimationFrame(trySub);
        }
        return;
      }
      setCurrentClientId(editor.getClientId());
      unsub = editor.subscribeChat(setMessages);
    };

    trySub();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      unsub?.();
    };
  }, [chatReady, editorRef]);

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
      const editor = editorRef.current;
      if (!editor) return;

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
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction,
            document: editor.getContent(),
            model,
          }),
        });

        const data = (await res.json()) as {
          message?: string;
          error?: string;
        };

        if (!res.ok || data.error) {
          throw new Error(data.error || `Request failed (${res.status})`);
        }

        const parsed = parseAssistantReply(data.message ?? "");
        const clientId = editor.getClientId() ?? userMsg.clientId;
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
        editor.appendChatMessage(aiMsg);
        if (parsed.documentEdit != null) {
          editor.applyAiEdit(parsed.documentEdit);
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
    [editorRef, model],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    const editor = editorRef.current;
    if (!text || busy || !editor) return;

    const clientId = editor.getClientId();
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
    if (inputRef.current) {
      inputRef.current.style.height = "";
    }
    editor.appendChatMessage(userMsg);

    if (mention) {
      await invokeAi(userMsg);
    }
  }, [busy, editorRef, input, invokeAi, user.color, user.name]);

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
        meta={`${peerCount} online`}
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
