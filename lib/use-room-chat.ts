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
import { buildAuxiliaryAiContext } from "@/lib/ai-aux-context";
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
import {
  AI_ROOM_PREFS_EVENT,
  DEFAULT_AI_TEMPERATURE,
  loadAiRoomPrefs,
  resolveAiRoomModel,
  saveAiRoomPrefs,
} from "@/lib/ai-room-prefs";
import { loadChatModel, saveChatModel } from "@/lib/chat-model-storage";
import {
  newChatMessageId,
  type RoomChatMessage,
} from "@/lib/room-chat";
import {
  filterSlashCommands,
  SLASH_COMMANDS,
  stripTrailingSlashToken,
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
  /**
   * Also mirror model to the global chat-model key (Forge).
   * Per-room model always persists when a room id is available (#60).
   */
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
  const roomId = workspace?.roomId ?? null;
  const review = useAiReview();
  const { prefs: chromePrefs } = useAiChromePrefs();
  const [model, setModelState] = useState<AiModelId>(DEFAULT_AI_MODEL);
  const [temperature, setTemperatureState] = useState(DEFAULT_AI_TEMPERATURE);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<RoomChatMessage[]>([]);
  const [busy, setBusyState] = useState(false);
  const busyRef = useRef(false);
  const setBusy = useCallback((next: boolean) => {
    busyRef.current = next;
    setBusyState(next);
  }, []);
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
    const fallback = persistModel ? loadChatModel() : DEFAULT_AI_MODEL;
    setModelState(resolveAiRoomModel(roomId, fallback) as AiModelId);
    const roomTemp = loadAiRoomPrefs(roomId).temperature;
    setTemperatureState(roomTemp ?? DEFAULT_AI_TEMPERATURE);
  }, [roomId, persistModel]);

  useEffect(() => {
    if (!roomId) return;
    const onPrefs = (event: Event) => {
      const detail = (event as CustomEvent<{ roomId?: string }>).detail;
      if (detail?.roomId && detail.roomId !== roomId) return;
      const prefs = loadAiRoomPrefs(roomId);
      if (prefs.model) setModelState(prefs.model as AiModelId);
      if (prefs.temperature !== undefined) {
        setTemperatureState(prefs.temperature);
      }
    };
    window.addEventListener(AI_ROOM_PREFS_EVENT, onPrefs);
    return () => window.removeEventListener(AI_ROOM_PREFS_EVENT, onPrefs);
  }, [roomId]);

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
      if (roomId) saveAiRoomPrefs(roomId, { model: next });
      if (persistModel) saveChatModel(next);
    },
    [persistModel, roomId],
  );

  const setTemperature = useCallback(
    (next: number) => {
      setTemperatureState(next);
      if (roomId) saveAiRoomPrefs(roomId, { temperature: next });
    },
    [roomId],
  );

  const cancelAi = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamingText(null);
    setBusy(false);
  }, [setBusy]);

  const instructionOverridesRef = useRef<Record<string, string>>({});
  const editSourceOverridesRef = useRef<Record<string, AiEditSource>>({});
  /** Pending slash commands — shown as chips; all run on Enter with optional context. */
  const [pendingSlashes, setPendingSlashes] = useState<SlashCommand[]>([]);
  const [replyTarget, setReplyTarget] = useState<RoomChatMessage | null>(null);
  /** One composer follow-up while Vimothy is busy (Enter queues; replaces prior). */
  const queuedSendRef = useRef<{
    input: string;
    slashes: SlashCommand[];
  } | null>(null);
  const [queuedLabel, setQueuedLabel] = useState<string | null>(null);

  const clearPendingSlash = useCallback(() => {
    setPendingSlashes([]);
  }, []);

  /** Remove one slash chip by index; Backspace on empty input pops the last. */
  const removeSlashChip = useCallback((index: number) => {
    setPendingSlashes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueuedSend = useCallback(() => {
    queuedSendRef.current = null;
    setQueuedLabel(null);
  }, []);

  /** Close the `/` menu and remove the trailing `/token` so Esc stays dismissed. */
  const dismissSlashMenu = useCallback(() => {
    const el = inputRef.current;
    const value = input;
    const caret = el?.selectionStart ?? value.length;
    const { next, caret: nextCaret } = stripTrailingSlashToken(value, caret);
    if (next !== value) {
      setInput(next);
      requestAnimationFrame(() => {
        const field = inputRef.current;
        field?.setSelectionRange(nextCaret, nextCaret);
        field?.focus();
      });
    }
    setSlashOpen(false);
    setSlashFilter("");
  }, [input]);

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

      if (busyRef.current) {
        setError("AI is busy — cancel it first to run a new request.");
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
      const noteText = snap?.text ?? beforeSnapshot;
      const includeSelection = aiFeatureEnabled(shell, "selectionActions");
      const aux = includeSelection
        ? buildAuxiliaryAiContext(noteText)
        : {};
      const packed = packAiChatContext({
        text: noteText,
        caretOffset: snap?.caret.offset,
        selection: snap?.selection,
        surrounding: snap?.surrounding,
        caret: snap?.caret,
        includeSelectionContext: includeSelection,
        includeAuxiliaryContext: includeSelection,
        diagnostics: aux.diagnostics,
        outline: aux.outline,
        citations: aux.citations,
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
          temperature,
          signal: ac.signal,
          selection: packed.selection,
          surrounding: packed.surrounding,
          caret: packed.caret,
          truncated: packed.truncated,
          diagnostics: packed.diagnostics,
          outline: packed.outline,
          citations: packed.citations,
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
          model: data.model,
          provider: data.provider,
          keySource: data.keySource ?? null,
          usage: data.usage ?? null,
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
        // Drain one queued send after the AI finishes.
        const queued = queuedSendRef.current;
        if (queued) {
          queuedSendRef.current = null;
          setQueuedLabel(null);
          setInput(queued.input);
          if (queued.slashes.length > 0) setPendingSlashes(queued.slashes);
          // Let state settle then fire automatically.
          requestAnimationFrame(() => {
            sendRef.current?.();
          });
        }
      }
    },
    [workspace, model, temperature, shell, review, busy, getEditorContext, messages],
  );

  // Stable ref so the drain callback can call send without a stale closure.
  const sendRef = useRef<(() => void) | null>(null);

  const send = useCallback(async () => {
    const ws = workspace;
    if (!ws || ws.readOnly) return;

    // While busy: queue this input (replaces any prior queued send).
    if (busy) {
      const slashes = pendingSlashes;
      const trimmed = input.trim();
      if (!trimmed && slashes.length === 0) return;
      const label =
        slashes.length > 0
          ? slashes.map((s) => `/${s.id}`).join(" ")
          : trimmed.slice(0, 40);
      queuedSendRef.current = { input, slashes };
      setQueuedLabel(label);
      setInput("");
      setPendingSlashes([]);
      return;
    }

    const slashes = pendingSlashes;
    const trimmed = input.trim();
    if (!trimmed && slashes.length === 0) return;

    const clientId = ws.getClientId();
    if (clientId == null) return;

    let text = trimmed;
    let mention = mentionsAi(text);
    let slashInstruction: string | null = null;

    if (slashes.length > 0) {
      const extra = stripAiMention(trimmed).trim();
      // Short bubble: /fix /rewrite … (+ optional user context). Full prompt via override.
      // Slash chips already imply Vimothy — don't prefix @vimothy in the bubble.
      const ids = slashes.map((s) => `/${s.id}`).join(" ");
      text = extra ? `${ids}\n${extra}` : ids;
      mention = true;
      // Build a combined instruction for all slash commands.
      const parts = slashes.map((slash) => {
        if (slash.id === "review") {
          return buildGrammarReviewInstruction(extra || undefined);
        }
        return extra
          ? `${slash.instruction}\n\nAdditional instructions from the user:\n${extra}`
          : slash.instruction;
      });
      slashInstruction = parts.join("\n\n---\n\n");
    } else if (replyTarget?.role === "ai" && !mention && trimmed) {
      // Replying to Vimothy continues the AI turn without typing @vimothy.
      mention = true;
    }

    const replyMeta =
      replyTarget != null
        ? {
            id: replyTarget.id,
            authorName:
              replyTarget.role === "ai" ? "Vimothy" : replyTarget.authorName,
            preview: replyTarget.text.replace(/\s+/g, " ").slice(0, 72),
          }
        : null;

    const userMsg: RoomChatMessage = {
      id: newChatMessageId(),
      clientId,
      authorName: user.name,
      authorColor: user.color,
      role: "user",
      text,
      mentionAi: mention,
      createdAt: Date.now(),
      replyTo: replyMeta,
    };

    if (slashes.length > 0 && slashInstruction) {
      instructionOverridesRef.current[userMsg.id] = slashInstruction;
      editSourceOverridesRef.current[userMsg.id] = "slash";
      const labelStr = slashes.map((s) => `/${s.id}`).join(" ");
      const previewStr = slashes.map((s) => s.title).join(" + ");
      setMessageContexts((prev) => ({
        ...prev,
        [userMsg.id]: {
          label: labelStr,
          preview: previewStr,
          lineFrom: 0,
          lineTo: 0,
        },
      }));
    }

    setInput("");
    setPendingSlashes([]);
    setReplyTarget(null);
    setMentionOpen(false);
    setSlashOpen(false);
    setSlashFilter("");
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
  }, [
    busy,
    workspace,
    input,
    pendingSlashes,
    replyTarget,
    invokeAi,
    user.color,
    user.name,
  ]);

  // Keep ref in sync so the post-invoke drain can call the latest send.
  useEffect(() => {
    sendRef.current = send;
  });

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
      // Keep optional user context only — slash chips imply @vimothy on send.
      const rest = stripAiMention(withoutToken)
        .replace(new RegExp(`^/${cmd.id}\\b\\s*`, "i"), "")
        .trim();
      const next = rest ? `${rest} ` : "";
      setInput(next);
      setPendingSlashes((prev) => {
        // Avoid duplicate chips for the same command.
        if (prev.some((s) => s.id === cmd.id)) return prev;
        return [...prev, cmd];
      });
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

  const startReply = useCallback((msg: RoomChatMessage) => {
    setReplyTarget(msg);
    setMentionOpen(false);
    setSlashOpen(false);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
    });
  }, []);

  const clearReply = useCallback(() => {
    setReplyTarget(null);
  }, []);

  const retryAi = useCallback(
    (msg: RoomChatMessage) => {
      if (busy || !msg.mentionAi) return;
      void invokeAi(msg);
    },
    [busy, invokeAi],
  );

  /** Re-run the user @vimothy turn that produced this AI reply (#60). */
  const regenerateAi = useCallback(
    (aiMsg: RoomChatMessage) => {
      if (busy || aiMsg.role !== "ai") return;
      const idx = messages.findIndex((m) => m.id === aiMsg.id);
      if (idx < 0) return;
      for (let i = idx - 1; i >= 0; i -= 1) {
        const prev = messages[i];
        if (prev?.role === "user" && prev.mentionAi) {
          void invokeAi(prev);
          return;
        }
      }
    },
    [busy, invokeAi, messages],
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
    pendingSlashes,
    clearPendingSlash,
    removeSlashChip,
    dismissSlashMenu,
    replyTarget,
    startReply,
    clearReply,
    messageContexts,
    model,
    setModel,
    temperature,
    setTemperature,
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
    queuedLabel,
    clearQueuedSend,
    runAiInstruction,
    retryAi,
    regenerateAi,
    defaultMentionTag: AI_MENTION_TAG,
  };
}
