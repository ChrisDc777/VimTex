import type { RoomChatMessage } from "@/lib/room-chat";

export type ChatMessageBlock = {
  key: string;
  isAi: boolean;
  isSelf: boolean;
  authorName: string;
  authorColor: string;
  startedAt: number;
  messages: RoomChatMessage[];
};

const BLOCK_GAP_MS = 120_000;

export function groupChatMessages(
  messages: RoomChatMessage[],
  currentClientId: number | null,
  currentUserName: string | null,
): ChatMessageBlock[] {
  const blocks: ChatMessageBlock[] = [];

  for (const message of messages) {
    const isAi = message.role === "ai";
    const isSelf =
      !isAi &&
      ((currentClientId != null && message.clientId === currentClientId) ||
        (currentUserName != null && message.authorName === currentUserName));
    const last = blocks[blocks.length - 1];
    const lastMessage = last?.messages[last.messages.length - 1];

    if (
      last &&
      last.isAi === isAi &&
      last.isSelf === isSelf &&
      lastMessage &&
      lastMessage.clientId === message.clientId &&
      lastMessage.authorName === message.authorName &&
      message.createdAt - lastMessage.createdAt < BLOCK_GAP_MS
    ) {
      last.messages.push(message);
      continue;
    }

    blocks.push({
      key: message.id,
      isAi,
      isSelf,
      authorName: message.authorName,
      authorColor: message.authorColor,
      startedAt: message.createdAt,
      messages: [message],
    });
  }

  return blocks;
}
