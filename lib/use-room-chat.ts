"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  earliestEditMarkerIndex,
  parseAssistantReply,
} from "@/lib/ai-chat";
import {
  applyAiPatch,
  type AppliedAiPatchHunk,
} from "@/lib/ai-patch";
import {
  packAiChatContext,
  selectionContextPreview,
  type EditorContextSnapshot,
  type SelectionContextPreview,
} from "@/lib/ai-chat-context";
import { buildAiHistoryFromRoomChat } from "@/lib/ai-chat-history";
import { postAiChat, streamAiChat } from "@/lib/ai-client";
import { formatAiError } from "@/lib/ai-errors";
import {
  aiFeatureEnabled,
  aiMayMutateDocument,
} from "@/lib/ai-features";
import { buildGrammarReviewInstruction } from "@/lib/grammar-review";
import { isDerivationCoachInstruction } from "@/lib/derivation-coach";
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
import {
  filterSlashCommands,
  SLASH_COMMANDS,
  type SlashCommand,
} from "@/lib/slash-commands";
import type { AiEditSource } from "@/lib/ai-review-store";
import { useAiChromePrefs } from "@/lib/use-ai-chrome-prefs";
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
  const { prefs: chromePrefs } = useAiChromePrefs();
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
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
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

  const filteredSlashCommands = useMemo(() => {
    if (aiFeatureEnabled(shell, "slashCommands")) {
      if (!chromePrefs.slashMenu) return [];
      return filterSlashCommands(slashFilter, undefined, {
        includeTemplates: aiFeatureEnabled(shell, "templatesGen"),
        includeGrammarReview: aiFeatureEnabled(shell, "grammarReview"),
        includeDerivationCoach: aiFeatureEnabled(shell, "derivationCoach"),
      });
    }
    // Forge: /derive only (#84) — no mutating slash surface.
    if (aiFeatureEnabled(shell, "derivationCoach")) {
      return filterSlashCommands(
        slashFilter,
        SLASH_COMMANDS.filter((c) => c.derivationCoach),
      );
    }
    return [];
  }, [shell, slashFilter, chromePrefs.slashMenu]);

  const updateComposerMenus = useCallback(
    (value: string, caret: number) => {
      const before = value.slice(0, caret);
      const at = before.match(/(^|[\s])@([a-zA-Z0-9_]*)$/);
      if (at) {
        const nextFilter = at[2] ?? "";
        setMentionOpen(true);
        setMentionFilter((prev) => {
          if (prev !== nextFilter) setMentionIndex(0);
          return nextFilter;
        });
        setSlashOpen(false);
        setSlashFilter("");
        return;
      }

      setMentionOpen(false);
      setMentionFilter("");

      const slashAllowed =
        (aiFeatureEnabled(shell, "slashCommands") && chromePrefs.slashMenu) ||
        (!aiFeatureEnabled(shell, "slashCommands") &&
          aiFeatureEnabled(shell, "derivationCoach"));
      if (!slashAllowed) {
        setSlashOpen(false);
        setSlashFilter("");
        return;
      }

      const slash = before.match(/(^|[\s])\/([a-zA-Z]*)$/);
      if (slash) {
        const nextFilter = slash[2] ?? "";
        setSlashOpen(true);
        // Only reset highlight when the filter text changes — not on ArrowUp/Down
        // (those fire keyup → onInputChange and used to pin the selection to 0).
        setSlashFilter((prev) => {
          if (prev !== nextFilter) setSlashIndex(0);
          return nextFilter;
        });
      } else {
        setSlashOpen(false);
        setSlashFilter("");
      }
    },
    [shell, chromePrefs.slashMenu],
  );

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
    setSlashOpen(false);
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
  const editSourceOverridesRef = useRef<Record<string, AiEditSource>>({});
  /** Pending slash command — shown as a chip; runs on Enter with optional context. */
  const [pendingSlash, setPendingSlash] = useState<SlashCommand | null>(null);

  const clearPendingSlash = useCallback(() => {
    setPendingSlash(null);
  }, []);

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
        setMessageContexts((prev) =>
          prev[userMsg.id]
            ? prev
            : { ...prev, [userMsg.id]: usedSelection },
        );
      }
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const useStream = aiFeatureEnabled(shell, "chatStreaming");
        const history = aiFeatureEnabled(shell, "chatMemory")
          ? buildAiHistoryFromRoomChat(messages, {
              beforeMessageId: userMsg.id,
            })
          : undefined;
        const coach = isDerivationCoachInstruction(instruction);
        const req = {
          instruction,
          document: packed.document,
          model,
          signal: ac.signal,
          selection: packed.selection,
          surrounding: packed.surrounding,
          caret: packed.caret,
          truncated: packed.truncated,
          ...(history && history.length > 0 ? { history } : {}),
          ...(coach ? { mode: "coach" as const } : {}),
        };
        const data = useStream
          ? await streamAiChat(req, {
              onToken: (acc) => {
                const cut = earliestEditMarkerIndex(acc);
                setStreamingText(
                  cut === -1 ? acc : acc.slice(0, cut).trimEnd(),
                );
              },
            })
          : await postAiChat(req);

        if (ac.signal.aborted) return;

        const parsed = parseAssistantReply(data.message ?? "");
        // Coach mode: never propose or attach note mutations (#84).
        let proposedAfter: string | null = coach
          ? null
          : parsed.documentEdit;
        let editKind: "document" | "patch" = "document";
        let appliedHunks: AppliedAiPatchHunk[] | undefined;

        if (!coach && parsed.patch) {
          const applied = applyAiPatch(beforeSnapshot, parsed.patch);
          if (applied.ok) {
            proposedAfter = applied.after;
            editKind = "patch";
            appliedHunks = applied.hunks;
          } else {
            notify.error(
              `Could not apply AI patch: ${applied.error}`,
            );
            proposedAfter = null;
          }
        }

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
          documentEdit: proposedAfter,
        };
        ws.appendChatMessage(aiMsg);

        if (proposedAfter == null || !aiMayMutateDocument(shell)) {
          // Forge / Q&A only (Forge still gets documentEdit blob for suggest UI).
        } else if (aiFeatureEnabled(shell, "diffAcceptReject")) {
          const source =
            editSourceOverridesRef.current[userMsg.id] ?? "chat";
          review.proposeDocumentEdit({
            messageId: aiMsg.id,
            before: beforeSnapshot,
            after: proposedAfter,
            source,
            createdAt: Date.now(),
            kind: editKind,
            hunks: appliedHunks,
          });
        } else {
          ws.applyAiEdit(proposedAfter);
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
    [workspace, model, shell, review, busy, getEditorContext, messages],
  );

  const send = useCallback(async () => {
    const ws = workspace;
    if (busy || !ws || ws.readOnly) return;

    const slash = pendingSlash;
    const trimmed = input.trim();
    if (!trimmed && !slash) return;

    const clientId = ws.getClientId();
    if (clientId == null) return;

    let text = trimmed;
    let mention = mentionsAi(text);
    let slashInstruction: string | null = null;

    if (slash) {
      const extra = stripAiMention(trimmed).trim();
      text = extra
        ? `@${AI_MENTION_TAG} ${extra}`
        : `@${AI_MENTION_TAG} ${slash.title}`;
      mention = true;
      slashInstruction =
        slash.id === "review"
          ? buildGrammarReviewInstruction(extra || undefined)
          : extra
            ? `${slash.instruction}\n\nAdditional instructions from the user:\n${extra}`
            : slash.instruction;
    }

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

    if (slash && slashInstruction) {
      instructionOverridesRef.current[userMsg.id] = slashInstruction;
      editSourceOverridesRef.current[userMsg.id] = "slash";
      setMessageContexts((prev) => ({
        ...prev,
        [userMsg.id]: {
          label: `/${slash.id}`,
          preview: slash.title,
          lineFrom: 0,
          lineTo: 0,
        },
      }));
    }

    setInput("");
    setPendingSlash(null);
    setMentionOpen(false);
    setSlashOpen(false);
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
  }, [busy, workspace, input, pendingSlash, invokeAi, user.color, user.name]);

  /** Programmatic @vimothy turn (#28 / #53 / #63). */
  const runAiInstruction = useCallback(
    async (
      instruction: string,
      opts?: {
        chatText?: string;
        attachment?: SelectionContextPreview;
        source?: AiEditSource;
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
      if (opts?.source) {
        editSourceOverridesRef.current[userMsg.id] = opts.source;
      }
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

  /** Attach slash command as a chip; optional context + Enter runs it. */
  const runSlashCommand = useCallback(
    (cmd: SlashCommand) => {
      const slashAllowed =
        aiFeatureEnabled(shell, "slashCommands") ||
        (cmd.derivationCoach &&
          aiFeatureEnabled(shell, "derivationCoach"));
      if (!slashAllowed) return;
      const el = inputRef.current;
      const value = input;
      const caret = el?.selectionStart ?? value.length;
      const before = value.slice(0, caret);
      const after = value.slice(caret);
      // Drop the `/partial` token that opened the menu.
      const withoutToken = before.replace(/(^|[\s])\/[a-zA-Z]*$/, "$1") + after;
      const rest = stripAiMention(withoutToken)
        .replace(new RegExp(`^/${cmd.id}\\b\\s*`, "i"), "")
        .trim();
      const next = rest
        ? `@${AI_MENTION_TAG} ${rest} `
        : `@${AI_MENTION_TAG} `;
      setInput(next);
      setPendingSlash(cmd);
      setSlashOpen(false);
      setSlashFilter("");
      requestAnimationFrame(() => {
        const field = inputRef.current;
        const pos = next.length;
        field?.focus();
        field?.setSelectionRange(pos, pos);
      });
    },
    [input, shell],
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
      updateComposerMenus(value, caret);
      workspace?.publishTyping(value.trim().length > 0);
    },
    [updateComposerMenus, workspace],
  );

  return {
    workspace,
    readOnly: workspace?.readOnly ?? false,
    shell,
    canMutateViaAi: aiMayMutateDocument(shell),
    useDiffReview: aiFeatureEnabled(shell, "diffAcceptReject"),
    pendingEdit,
    editOutcomes,
    acceptPendingEdit: () => review.acceptPending(),
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
    pendingSlash,
    clearPendingSlash,
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
    slashOpen,
    slashIndex,
    setSlashIndex,
    setSlashOpen,
    stickBottom,
    currentClientId,
    listRef: listRef as RefObject<HTMLDivElement | null>,
    inputRef: inputRef as RefObject<HTMLTextAreaElement | null>,
    filteredMentions,
    filteredSlashCommands,
    onListScroll,
    scrollToBottom,
    insertMention,
    runSlashCommand,
    insertSuggestion,
    onInputChange,
    send,
    runAiInstruction,
    retryAi,
    defaultMentionTag: AI_MENTION_TAG,
  };
}
