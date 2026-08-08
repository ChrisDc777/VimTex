"use client";

import { useEffect, type MutableRefObject } from "react";
import { AiDiffProposal } from "@/components/chat/AiDiffProposal";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatContextAttachment } from "@/components/chat/ChatContextChip";
import { DocActionPills } from "@/components/chat/DocActionPills";
import { RefreshIcon } from "@/components/chat/icons";
import { AvatarStack } from "@/components/presence/AvatarStack";
import { TypingIndicator } from "@/components/presence/TypingIndicator";
import { formatChatMessageBody } from "@/lib/chat-message-body";
import type { EditorContextSnapshot } from "@/lib/ai-chat-context";
import { aiFeatureEnabled } from "@/lib/ai-features";
import { DOC_AI_ACTIONS, type DocAiAction } from "@/lib/doc-ai-actions";
import { renderNoteDiagnostics } from "@/lib/render-note";
import { useAiChromePrefs } from "@/lib/use-ai-chrome-prefs";
import { useRoomChat } from "@/lib/use-room-chat";
import { formatRelativeTime } from "@/lib/room-chat";
import type { CollabUser, PeerInfo } from "@/lib/types";

export type StudioAiRunner = {
  runInstruction: (
    instruction: string,
    opts?: {
      chatText?: string;
      attachment?: import("@/lib/ai-chat-context").SelectionContextPreview;
      source?: import("@/lib/ai-review-store").AiEditSource;
    },
  ) => Promise<void>;
  busy: boolean;
};

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
  /** Live editor snapshot for AI context (#57). */
  getEditorContext?: () => EditorContextSnapshot | null;
  /** Shell binds selection actions (#28) without lifting chat state. */
  aiRunnerRef?: MutableRefObject<StudioAiRunner | null>;
};

export function StudioRoomChat({
  open = true,
  embedded = false,
  onClose,
  peers,
  selfClientId,
  user,
  chatReady,
  getEditorContext,
  aiRunnerRef,
}: StudioRoomChatProps) {
  const { prefs: chromePrefs } = useAiChromePrefs();
  const chat = useRoomChat({
    open,
    chatReady,
    user,
    shell: "studio",
    persistModel: false,
    getEditorContext,
  });

  useEffect(() => {
    if (!aiRunnerRef) return;
    aiRunnerRef.current = {
      runInstruction: chat.runAiInstruction,
      busy: chat.busy,
    };
    return () => {
      if (aiRunnerRef.current?.runInstruction === chat.runAiInstruction) {
        aiRunnerRef.current = null;
      }
    };
  }, [aiRunnerRef, chat.runAiInstruction, chat.busy]);

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
        ref={chat.listRef}
        onScroll={chat.onListScroll}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2.5 py-2"
      >
        {chat.messages.length === 0 ? (
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
        ) : null}

        {chat.messages.map((m, i) => {
          const isAi = m.role === "ai";
          const isSelf =
            !isAi &&
            ((chat.currentClientId != null &&
              m.clientId === chat.currentClientId) ||
              m.authorName === user.name);
          const prev = chat.messages[i - 1];
          const continued =
            !!prev &&
            prev.role === m.role &&
            prev.clientId === m.clientId &&
            prev.authorName === m.authorName &&
            m.createdAt - prev.createdAt < 120_000;
          const showError = chat.error && chat.errorForId === m.id;
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
                    {formatRelativeTime(m.createdAt, chat.now)}
                  </span>
                </div>
              ) : null}
              <div className="vt-chat-msg__body">
                {formatChatMessageBody(m.text)}
              </div>
              {chat.messageContexts[m.id] ? (
                <ChatContextAttachment preview={chat.messageContexts[m.id]!} />
              ) : null}
              {isAi && m.documentEdit != null ? (
                chat.pendingEdit?.messageId === m.id ? (
                  <AiDiffProposal
                    before={chat.pendingEdit.before}
                    after={chat.pendingEdit.after}
                    onAccept={chat.acceptPendingEdit}
                    onReject={chat.rejectPendingEdit}
                    disabled={chat.busy || chat.readOnly}
                  />
                ) : (
                  <p className="vt-chat-msg__hint">
                    {chat.editOutcomes[m.id] === "accepted" ||
                    chat.editOutcomes[m.id] === "auto"
                      ? chat.editOutcomes[m.id] === "auto"
                        ? "Auto-applied"
                        : "Accepted — applied to note"
                      : chat.editOutcomes[m.id] === "rejected"
                        ? "Rejected — note unchanged"
                        : chat.canMutateViaAi
                          ? "Proposed edit"
                          : "Proposed edit (not applied — Studio can accept changes)"}
                  </p>
                )
              ) : null}
              {showError ? (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-body">{chat.error}</p>
                  <button
                    type="button"
                    onClick={() => chat.retryAi(m)}
                    disabled={chat.busy}
                    className="vt-chat-retry"
                    aria-label="Retry"
                  >
                    <RefreshIcon />
                    Retry
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}

        {chat.busy ? (
          <div className="vt-chat-msg vt-chat-msg--ai mt-2">
            <div className="vt-chat-msg__meta">
              <span
                className="vt-chat-msg__author"
                style={{ color: "var(--primary)" }}
              >
                Vimothy
              </span>
              <span className="vt-chat-msg__time">streaming</span>
            </div>
            <div className="vt-chat-msg__body whitespace-pre-wrap">
              {chat.streamingText?.trim()
                ? formatChatMessageBody(chat.streamingText)
                : "Thinking…"}
            </div>
          </div>
        ) : null}
      </div>

      <TypingIndicator
        typing={peers.filter((peer) => peer.typing)}
        selfClientId={selfClientId}
      />

      {aiFeatureEnabled("studio", "chatDocActions") &&
      chromePrefs.docActionPills &&
      !chat.readOnly ? (
        <DocActionPills
          actions={DOC_AI_ACTIONS}
          disabled={chat.busy}
          onRun={(action: DocAiAction) => {
            const note =
              getEditorContext?.()?.text ?? chat.workspace?.getText() ?? "";
            let instruction = action.buildInstruction(note);
            if (action.id === "fix-errors") {
              const diags = renderNoteDiagnostics(note).slice(0, 20);
              if (diags.length > 0) {
                instruction +=
                  "\n\nKnown diagnostics:\n" +
                  diags
                    .map((d) => `- L${d.line}:${d.column} ${d.message}`)
                    .join("\n");
              }
            }
            void chat.runAiInstruction(instruction, {
              chatText: action.chatText,
              source: "chat",
            });
          }}
        />
      ) : null}

      <ChatComposer
        input={chat.input}
        busy={chat.busy}
        model={chat.model}
        inputRef={chat.inputRef}
        mentionOpen={chat.mentionOpen}
        filteredMentions={[...chat.filteredMentions]}
        mentionIndex={chat.mentionIndex}
        onInputChange={chat.onInputChange}
        onModelChange={chat.setModel}
        onSend={() => void chat.send()}
        onCancel={chat.cancelAi}
        onMentionSelect={chat.insertMention}
        onMentionIndexChange={chat.setMentionIndex}
        onMentionClose={() => chat.setMentionOpen(false)}
        slashOpen={chat.slashOpen}
        filteredSlashCommands={chat.filteredSlashCommands}
        slashIndex={chat.slashIndex}
        onSlashSelect={chat.runSlashCommand}
        onSlashIndexChange={chat.setSlashIndex}
        onSlashClose={() => chat.setSlashOpen(false)}
        slashCommandsEnabled={
          chat.shell === "studio" && chromePrefs.slashMenu
        }
        readOnly={chat.readOnly}
        selectionPreview={chat.selectionPreview}
        onHideSelectionChip={chat.hideSelectionChip}
      />
    </>
  );

  if (embedded) {
    return <div className="flex h-full min-h-0 flex-col">{panel}</div>;
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
