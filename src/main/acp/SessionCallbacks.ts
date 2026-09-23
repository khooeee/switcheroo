import type { PermissionRequest, TranscriptItem } from "../../shared/types";

export interface SessionCallbacks {
  onPromptComplete: () => void;
  onSteeringSupport: (supported: boolean) => void;
  onTranscript: (item: TranscriptItem, replaceId?: string) => void;
  onStatus: (status: "connecting" | "ready" | "running" | "error" | "idle", error?: string | null) => void;
  onPermission: (req: PermissionRequest) => void;
  onAskQuestion: (req: {
    requestId: string;
    tabId: string;
    toolCallId: string;
    title?: string;
    questions: Array<{
      id: string;
      prompt: string;
      options: Array<{ id: string; label: string }>;
      allowMultiple?: boolean;
    }>;
  }) => void;
}
