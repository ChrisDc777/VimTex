"use client";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { CloseIcon } from "@/components/chat/icons";
import { AvatarStack } from "@/components/presence/AvatarStack";
import { TypingIndicator } from "@/components/presence/TypingIndicator";
import { SidePanelHeader } from "@/components/SidePanelHeader";
import { useRoomChat } from "@/lib/use-room-chat";
import type { CollabUser, PeerInfo } from "@/lib/types";

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
  const chat = useRoomChat({
    open,
    chatReady,
    user,
    shell: "forge",
    persistModel: true,
  });

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
      />

      <TypingIndicator
        typing={peers.filter((peer) => peer.typing)}
        selfClientId={selfClientId}
      />

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
        readOnly={chat.readOnly}
      />
    </div>
  );
}
