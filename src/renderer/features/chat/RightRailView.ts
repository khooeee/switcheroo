import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import type { SubagentRailInfo } from "../subagents/SubagentRailInfo";

/** What the right rail shows: one turn (Turn Details) or one subagent's transcript. */
export type RightRailView = {
  turn: TranscriptTurn | null;
  subagent: (SubagentRailInfo & { turns: TranscriptTurn[]; loading: boolean }) | null;
  session: Session;
  focusEventId?: string;
  focusKey: number;
};
