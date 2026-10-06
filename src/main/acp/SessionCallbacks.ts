import type { PermissionRequest } from "../../shared/agentRequests";
import type { SessionUsage, SlashCommand } from "../../shared/session";
import type { TranscriptTurn } from "../../shared/transcript";

export interface SessionCallbacks {
  onQuestionSettled?: (requestId: string) => void;
  onPromptComplete: () => void;
  onSteeringSupport: (supported: boolean) => void;
  /** Agent advertised `sessionCapabilities.fork` in ACP initialize. */
  onForkSupport: (supported: boolean) => void;
  onAvailableCommands: (commands: SlashCommand[]) => void;
  onUsage: (usage: SessionUsage) => void;
  onTurn: (turn: TranscriptTurn) => void;
  onTurnRemoved?: (turnId: string) => void;
  /** A turn in one of this session's subagent transcripts started or changed. */
  onSubagentTurn?: (subagentId: string, turn: TranscriptTurn) => void;
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
