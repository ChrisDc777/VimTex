"use client";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { DocActionPills } from "@/components/chat/DocActionPills";
import { AvatarStack } from "@/components/presence/AvatarStack";
import { TypingIndicator } from "@/components/presence/TypingIndicator";
import type { EditorContextSnapshot } from "@/lib/ai-chat-context";
import { aiFeatureEnabled } from "@/lib/ai-features";
import {
  DOC_AI_ACTIONS,
  filterDocAiActions,
  type DocAiAction,
} from "@/lib/doc-ai-actions";
import { buildGrammarReviewInstruction } from "@/lib/grammar-review";
import { renderNoteDiagnostics } from "@/lib/render-note";
import { useAiChromePrefs } from "@/lib/use-ai-chrome-prefs";
import { useRoomChat } from "@/lib/use-room-chat";
import type { CollabUser, PeerInfo } from "@/lib/types";
import { useEffect, type MutableRefObject } from "react";

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
  /** Parent supplies `RightPanelSwitcher` — hide duplicate header/close. */
  chromeless?: boolean;
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
  chromeless = false,
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
      {chromeless ? null : (
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
      )}

      <ChatMessageList
        messages={chat.messages}
        currentClientId={chat.currentClientId}
        currentUserName={user.name}
        now={chat.now}
        busy={chat.busy}
        error={chat.error}
        errorForId={chat.errorForId}
        listRef={chat.listRef}
        onScroll={chat.onListScroll}
        onRetry={chat.retryAi}
        onRegenerate={chat.regenerateAi}
        onReply={chat.startReply}
        onSuggestion={chat.insertSuggestion}
        stickBottom={chat.stickBottom}
        onScrollToBottom={chat.scrollToBottom}
        peerCount={peers.length}
        canMutateViaAi={chat.canMutateViaAi}
        pendingEdit={chat.pendingEdit}
        editOutcomes={chat.editOutcomes}
        onAcceptEdit={chat.acceptPendingEdit}
        onRejectEdit={chat.rejectPendingEdit}
        readOnly={chat.readOnly}
        streamingText={chat.streamingText}
        messageContexts={chat.messageContexts}
        emptySubtitle="Message the room. Type @ to ask Vimothy."
      />

      <TypingIndicator
        typing={peers.filter((peer) => peer.typing)}
        selfClientId={selfClientId}
      />

      {aiFeatureEnabled("studio", "chatDocActions") &&
      chromePrefs.docActionPills &&
      !chat.readOnly ? (
        <DocActionPills
          actions={filterDocAiActions(DOC_AI_ACTIONS, {
            includeGrammarReview: aiFeatureEnabled("studio", "grammarReview"),
          })}
          disabled={chat.busy}
          onRun={(action: DocAiAction) => {
            const note =
              getEditorContext?.()?.text ?? chat.workspace?.getText() ?? "";
            let instruction =
              action.id === "review"
                ? buildGrammarReviewInstruction()
                : action.buildInstruction(note);
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
        onSlashClose={() => chat.dismissSlashMenu()}
        slashCommandsEnabled={chat.slashCommandsEnabled}
        readOnly={chat.readOnly}
        selectionPreview={chat.selectionPreview}
        onHideSelectionChip={chat.hideSelectionChip}
        modelPickerVariant="studio"
        queuedLabel={chat.queuedLabel}
        onClearQueuedSend={chat.clearQueuedSend}
        replyTarget={chat.replyTarget}
        onClearReply={chat.clearReply}
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
