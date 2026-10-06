import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import type { SubagentRailInfo } from "../subagents/SubagentRailInfo";

/** What the right rail shows: one turn (Turn Details) or one subagent's transcript. */
export type RightRailView = {
  turn: TranscriptTurn | null;
  subagent: (SubagentRailInfo & { turns: TranscriptTurn[]; loading: boolean }) | null;
  sessionId: string;
  session: Session | undefined;
  agent: string;
  cwd?: string;
  focusEventId?: string;
  focusKey: number;
};
