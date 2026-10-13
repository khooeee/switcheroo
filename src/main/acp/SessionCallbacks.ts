import type { CursorAskQuestionRequest } from "../../shared/agentRequests";
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
  onAskQuestion: (req: CursorAskQuestionRequest) => void;
  getSessionTitle: () => string;
}
