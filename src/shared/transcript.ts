import type { FileChange } from "./fileChange";

type TurnStatus = "running" | "complete" | "stopped";

export type TranscriptRole = "user" | "assistant" | "thought" | "tool" | "system" | "stopped";

export interface TranscriptItem {
  id: string;
  role: TranscriptRole;
  text: string;
  at: number;
  /** Waiting behind an in-flight prompt (not yet sent to the agent). */
  queued?: boolean;
  toolCallId?: string;
  toolStatus?: string;
  toolTitle?: string;
  fileChanges?: FileChange[];
}

/** One user prompt and the session updates that followed it. */
export interface TranscriptTurn {
  id: string;
  /** User message time — used for Switchboard / find sort order. */
  at: number;
  user: TranscriptItem;
  /** Latest assistant message; prior assistants live in `events`. */
  assistant: TranscriptItem | null;
  events: TranscriptItem[];
  /** Aggregated from tool events in this turn. */
  fileChanges: FileChange[];
  status: TurnStatus;
}
