import type { EditorContextSnapshot } from "@/lib/ai-chat-context";
import type { CollabUser, PeerInfo } from "@/lib/types";
import type { MutableRefObject } from "react";

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
  open?: boolean;
  embedded?: boolean;
  onClose: () => void;
  peers: PeerInfo[];
  selfClientId?: number | null;
  user: CollabUser;
  chatReady: boolean;
  getEditorContext?: () => EditorContextSnapshot | null;
  aiRunnerRef?: MutableRefObject<StudioAiRunner | null>;
};
