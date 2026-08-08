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
import {
  packAiChatContext,
  selectionContextPreview,
  type EditorContextSnapshot,
  type SelectionContextPreview,
} from "@/lib/ai-chat-context";
import { postAiChat, streamAiChat } from "@/lib/ai-client";
import { formatAiError } from "@/lib/ai-errors";
import {
  aiFeatureEnabled,
  aiMayMutateDocument,
} from "@/lib/ai-features";
import {
  DEFAULT_AI_MODEL,
  providerForModel,
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
import { notify } from "@/lib/toasts";
import type { CollabUser } from "@/lib/types";
import type { UiVariant } from "@/lib/ui-variant";
import { useAiReview } from "@/components/ai/AiReviewProvider";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

export type UseRoomChatOptions = {
  open: boolean;
  chatReady: boolean;
  user: CollabUser;
  /** Shell that owns this chat — drives AI feature gate (#59). */
  shell: UiVariant;
  /** Persist model choice (Forge). Studio may leave this false. */
  persistModel?: boolean;
  /** Live editor snapshot for context packing (#57). */
  getEditorContext?: () => EditorContextSnapshot | null;
};

/**
 * Shared room-chat controller for Studio and Forge skins.
 * Owns subscription, composer state, @vimothy AI invoke, and typing heartbeat.
 * Document proposals go through AiReviewStore (not local React state).
 */
export function useRoomChat({
  open,
  chatReady,
  user,
  shell,
  persistModel = true,
  getEditorContext,
}: UseRoomChatOptions) {
  const workspace = useWorkspace();
  const review = useAiReview();
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
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [selectionPreview, setSelectionPreview] =
    useState<SelectionContextPreview | null>(null);
  const [selectionChipHidden, setSelectionChipHidden] = useState(false);
  const [messageContexts, setMessageContexts] = useState<
    Record<string, SelectionContextPreview>
  >({});
  const abortRef = useRef<AbortController | null>(null);
  const prevSelectionRef = useRef<SelectionContextPreview | null>(null);
  const selectionChipHiddenRef = useRef(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const pendingEdit = review.pending;
  const editOutcomes = review.outcomes;

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
  }, [messages, busy, open, stickBottom, error, streamingText, pendingEdit]);

  /** Live selection chip for Studio when the editor has a non-empty range. */
  useEffect(() => {
    if (!open || !getEditorContext) {
      setSelectionPreview(null);
      return;
    }
    if (!aiFeatureEnabled(shell, "selectionActions")) {
      setSelectionPreview(null);
      return;
    }

    const tick = () => {
      const snap = getEditorContext();
      const next = snap ? selectionContextPreview(snap) : null;
      const prev = prevSelectionRef.current;
      const changed =
        prev?.label !== next?.label || prev?.preview !== next?.preview;
      if (!next || changed) {
        selectionChipHiddenRef.current = false;
      }
      prevSelectionRef.current = next;
      setSelectionPreview(next);
      setSelectionChipHidden(selectionChipHiddenRef.current);
    };

    tick();
    const id = window.setInterval(tick, 350);
    return () => window.clearInterval(id);
  }, [open, getEditorContext, shell]);

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

  const cancelAi = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamingText(null);
    setBusy(false);
  }, []);

  const instructionOverridesRef = useRef<Record<string, string>>({});

  const invokeAi = useCallback(
    async (userMsg: RoomChatMessage) => {
      const ws = workspace;
      if (!ws) return;

      const instruction =
        instructionOverridesRef.current[userMsg.id] ??
        stripAiMention(userMsg.text);
      if (!instruction) {
        setError(`Add an instruction after @${AI_MENTION_TAG}.`);
        setErrorForId(userMsg.id);
        return;
      }

      if (busy) {
        setError("AI is already running — cancel it or wait.");
        setErrorForId(userMsg.id);
        return;
      }

      if (
        review.pending &&
        aiFeatureEnabled(shell, "diffAcceptReject") &&
        review.prefs.applyMode === "confirm"
      ) {
        setError("Accept or reject the pending AI edit first.");
        setErrorForId(userMsg.id);
        return;
      }

      setBusy(true);
      setError(null);
      setErrorForId(null);
      setStreamingText(null);
      const beforeSnapshot = ws.getText();
      const snap = getEditorContext?.() ?? null;
      const packed = packAiChatContext({
        text: snap?.text ?? beforeSnapshot,
        caretOffset: snap?.caret.offset,
        selection: snap?.selection,
        surrounding: snap?.surrounding,
        caret: snap?.caret,
        includeSelectionContext: aiFeatureEnabled(shell, "selectionActions"),
      });
      const usedSelection =
        packed.selection && snap
          ? selectionContextPreview({
              ...snap,
              selection: packed.selection,
            })
          : null;
      if (usedSelection) {
        setMessageContexts((prev) => ({
          ...prev,
          [userMsg.id]: usedSelection,
        }));
      }
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const useStream = aiFeatureEnabled(shell, "chatStreaming");
        const req = {
          instruction,
          document: packed.document,
          model,
          signal: ac.signal,
          selection: packed.selection,
          surrounding: packed.surrounding,
          caret: packed.caret,
          truncated: packed.truncated,
        };
        const data = useStream
          ? await streamAiChat(req, {
              onToken: (acc) => {
                const cut = acc.indexOf("@@@DOCUMENT");
                setStreamingText(
                  cut === -1 ? acc : acc.slice(0, cut).trimEnd(),
                );
              },
            })
          : await postAiChat(req);

        if (ac.signal.aborted) return;

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
          // Forge / Q&A only.
        } else if (aiFeatureEnabled(shell, "diffAcceptReject")) {
          review.proposeDocumentEdit({
            messageId: aiMsg.id,
            before: beforeSnapshot,
            after: parsed.documentEdit,
            source: "chat",
            createdAt: Date.now(),
          });
        } else {
          ws.applyAiEdit(parsed.documentEdit);
        }
      } catch (err) {
        if (
          ac.signal.aborted ||
          (err instanceof Error && err.name === "AbortError")
        ) {
          setError("Cancelled.");
          setErrorForId(userMsg.id);
          return;
        }
        const raw = err instanceof Error ? err.message : "Unknown error";
        const modelLabel =
          providerForModel(model).models.find((m) => m.id === model)?.label ??
          model;
        const detail = formatAiError(raw, { model, modelLabel });
        setError(detail);
        setErrorForId(userMsg.id);
        notify.error(detail);
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
        setStreamingText(null);
        setBusy(false);
      }
    },
    [workspace, model, shell, review, busy, getEditorContext],
  );

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

  /** Programmatic @vimothy turn (#28 / #53). */
  const runAiInstruction = useCallback(
    async (
      instruction: string,
      opts?: {
        chatText?: string;
        attachment?: SelectionContextPreview;
      },
    ) => {
      const ws = workspace;
      const trimmed = instruction.trim();
      if (!trimmed || busy || !ws || ws.readOnly) return;
      const clientId = ws.getClientId();
      if (clientId == null) return;

      const visible = (opts?.chatText ?? trimmed).trim();
      const text = `@${AI_MENTION_TAG} ${visible}`;
      const userMsg: RoomChatMessage = {
        id: newChatMessageId(),
        clientId,
        authorName: user.name,
        authorColor: user.color,
        role: "user",
        text,
        mentionAi: true,
        createdAt: Date.now(),
      };

      instructionOverridesRef.current[userMsg.id] = trimmed;
      if (opts?.attachment) {
        setMessageContexts((prev) => ({
          ...prev,
          [userMsg.id]: opts.attachment!,
        }));
      }

      setError(null);
      setErrorForId(null);
      setStickBottom(true);
      ws.appendChatMessage(userMsg);
      await invokeAi(userMsg);
    },
    [busy, workspace, invokeAi, user.color, user.name],
  );

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
    acceptPendingEdit: () => {
      review.acceptPending();
    },
    rejectPendingEdit: () => {
      review.rejectPending();
    },
    cancelAi,
    streamingText,
    selectionPreview:
      selectionPreview && !selectionChipHidden ? selectionPreview : null,
    hideSelectionChip: () => {
      selectionChipHiddenRef.current = true;
      setSelectionChipHidden(true);
    },
    messageContexts,
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
    runAiInstruction,
    retryAi,
    defaultMentionTag: AI_MENTION_TAG,
  };
}
