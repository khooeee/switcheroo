import type { AgentKind } from "../../shared/agentKind";
import type { TranscriptTurn } from "../../shared/transcript";

/** One session's transcript, as Find in History searches it. */
export type FindSource = {
  sessionId: string;
  title: string;
  agent: AgentKind;
  turns: TranscriptTurn[];
};
