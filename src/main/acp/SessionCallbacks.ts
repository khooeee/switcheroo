import type { PermissionRequest, SessionUsage, SlashCommand, TranscriptItem } from "../../shared/types";

export interface SessionCallbacks {
  onQuestionSettled?: (requestId: string) => void;
  onPromptComplete: () => void;
  onSteeringSupport: (supported: boolean) => void;
  onAvailableCommands: (commands: SlashCommand[]) => void;
  onUsage: (usage: SessionUsage) => void;
  onTranscript: (item: TranscriptItem, replaceId?: string) => void;
  onStatus: (status: "connecting" | "ready" | "running" | "error" | "idle", error?: string | null) => void;
  onPermission: (req: PermissionRequest) => void;
  onAskQuestion: (req: {
    requestId: string;
    sessionId: string;
    toolCallId: string;
    title?: string;
    questions: Array<{
      id: string;
      prompt: string;
      options: Array<{ id: string; label: string }>;
      allowMultiple?: boolean;
    }>;
  }) => void;
  getSessionTitle: () => string;
}
