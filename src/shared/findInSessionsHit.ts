import type { AgentKind } from "./agentKind";
import type { TranscriptRole } from "./transcript";

/** One transcript hit from Find in History (Cmd+Shift+F). */
export interface FindInSessionsHit {
  sessionId: string;
  turnId: string;
  eventId: string;
  title: string;
  agent: AgentKind;
  role: TranscriptRole;
  snippet: string;
  at: number;
}
