import type { AgentKind } from "../../shared/agentKind";
import type { TranscriptTurn } from "../../shared/transcript";

/** One finished turn in a daily log. */
export interface DailyLogEntry {
  /** When the turn finished; picks the day's file. */
  at: number;
  sessionId: string;
  turnId: string;
  /** Title when the turn finished; a session's last entry has its latest title. */
  title: string;
  cwd: string;
  agent: AgentKind;
  status: TranscriptTurn["status"];
  /** The prompt and any steers, clipped. */
  prompt: string;
  /** Final assistant message, clipped. */
  reply: string;
  /** Changed file paths; diffs stay in the transcript. */
  files: string[];
  /** The session was started by a cron. */
  cron: boolean;
}
