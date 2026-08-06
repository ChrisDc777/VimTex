"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { parseAssistantReply } from "@/lib/ai-chat";
import { postAiChat } from "@/lib/ai-client";
import {
  aiFeatureEnabled,
  aiMayMutateDocument,
} from "@/lib/ai-features";
import {
  DEFAULT_AI_MODEL,
  type AiModelId,
} from "@/lib/ai-providers";
import {
  AI_MENTION_SUGGESTIONS,
  AI_MENTION_TAG,
  mentionsAi,
  stripAiMention,
} from "@/lib/chat-mentions";
import { loadChatModel, saveChatModel } from "@/lib/chat-model-storage";
import {
  newChatMessageId,
  type RoomChatMessage,
} from "@/lib/room-chat";
import type { CollabUser } from "@/lib/types";
import type { UiVariant } from "@/lib/ui-variant";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

export type UseRoomChatOptions = {
  open: boolean;
  chatReady: boolean;
  user: CollabUser;
  /** Shell that owns this chat — drives AI feature gate (#59). */
  shell: UiVariant;
  /** Persist model choice (Forge). Studio may leave this false. */
  persistModel?: boolean;
};

/**
 * Shared room-chat controller for Studio and Forge skins.
 * Owns subscription, composer state, @vimothy AI invoke, and typing heartbeat.
 */
export function useRoomChat({
  open,
  chatReady,
  user,
  shell,
  persistModel = true,
}: UseRoomChatOptions) {
  const workspace = useWorkspace();
  const [model, setModelState] = useState<AiModelId>(DEFAULT_AI_MODEL);
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
  const [pendingEdit, setPendingEdit] = useState<{
    messageId: string;
    before: string;
    after: string;
  } | null>(null);
  const [editOutcomes, setEditOutcomes] = useState<
    Record<string, "accepted" | "rejected">
  >({});

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!persistModel) return;
    setModelState(loadChatModel());
  }, [persistModel]);

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

  const onListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickBottom(dist < 48);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setStickBottom(true);
  }, []);

  const filteredMentions = useMemo(
    () =>
      AI_MENTION_SUGGESTIONS.filter((s) =>
        s.startsWith(mentionFilter.toLowerCase()),
      ),
    [mentionFilter],
  );

  const updateMentionState = useCallback((value: string, caret: number) => {
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
  }, []);

  const insertMention = useCallback(
    (tag: string) => {
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
    },
    [input],
  );

  const insertSuggestion = useCallback((text: string) => {
    setInput(text);
    setMentionOpen(false);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.setSelectionRange(text.length, text.length);
    });
  }, []);

  const setModel = useCallback(
    (next: AiModelId) => {
      setModelState(next);
      if (persistModel) saveChatModel(next);
    },
    [persistModel],
  );

  const invokeAi = useCallback(
    async (userMsg: RoomChatMessage) => {
      const ws = workspace;
      if (!ws) return;

      const instruction = stripAiMention(userMsg.text);
      if (!instruction) {
        setError(`Add an instruction after @${AI_MENTION_TAG}.`);
        setErrorForId(userMsg.id);
        return;
      }

      if (pendingEdit && aiFeatureEnabled(shell, "diffAcceptReject")) {
        setError("Accept or reject the pending AI edit first.");
        setErrorForId(userMsg.id);
        return;
      }

      setBusy(true);
      setError(null);
      setErrorForId(null);
      const beforeSnapshot = ws.getText();

      try {
        const data = await postAiChat({
          instruction,
          document: beforeSnapshot,
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
        if (parsed.documentEdit == null || !aiMayMutateDocument(shell)) {
          // Forge / no edit proposal: chat only.
        } else if (aiFeatureEnabled(shell, "diffAcceptReject")) {
          setPendingEdit({
            messageId: aiMsg.id,
            before: beforeSnapshot,
            after: parsed.documentEdit,
          });
        } else {
          // Legacy auto-apply (should not run once #27 is on).
          ws.applyAiEdit(parsed.documentEdit);
          setEditOutcomes((prev) => ({ ...prev, [aiMsg.id]: "accepted" }));
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Unknown error";
        setError(detail);
        setErrorForId(userMsg.id);
      } finally {
        setBusy(false);
      }
    },
    [workspace, model, shell, pendingEdit],
  );

  const acceptPendingEdit = useCallback(() => {
    const ws = workspace;
    if (!ws || !pendingEdit || ws.readOnly) return;
    ws.applyAiEdit(pendingEdit.after);
    setEditOutcomes((prev) => ({
      ...prev,
      [pendingEdit.messageId]: "accepted",
    }));
    setPendingEdit(null);
  }, [workspace, pendingEdit]);

  const rejectPendingEdit = useCallback(() => {
    if (!pendingEdit) return;
    setEditOutcomes((prev) => ({
      ...prev,
      [pendingEdit.messageId]: "rejected",
    }));
    setPendingEdit(null);
  }, [pendingEdit]);

  const send = useCallback(async () => {
    const text = input.trim();
    const ws = workspace;
    if (!text || busy || !ws || ws.readOnly) return;

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

  const onInputChange = useCallback(
    (value: string, caret: number) => {
      setInput(value);
      updateMentionState(value, caret);
      workspace?.publishTyping(value.trim().length > 0);
    },
    [updateMentionState, workspace],
  );

  return {
    workspace,
    readOnly: workspace?.readOnly ?? false,
    shell,
    canMutateViaAi: aiMayMutateDocument(shell),
    useDiffReview: aiFeatureEnabled(shell, "diffAcceptReject"),
    pendingEdit,
    editOutcomes,
    acceptPendingEdit,
    rejectPendingEdit,
    model,
    setModel,
    input,
    messages,
    busy,
    error,
    errorForId,
    now,
    mentionOpen,
    mentionIndex,
    setMentionIndex,
    setMentionOpen,
    stickBottom,
    currentClientId,
    listRef: listRef as RefObject<HTMLDivElement | null>,
    inputRef: inputRef as RefObject<HTMLTextAreaElement | null>,
    filteredMentions,
    onListScroll,
    scrollToBottom,
    insertMention,
    insertSuggestion,
    onInputChange,
    send,
    retryAi,
    defaultMentionTag: AI_MENTION_TAG,
  };
}
