import type { AgentKind } from "./agentKind";
import type { TranscriptTurn } from "./transcript";

/** A session turn mirrored into the Switchboard feed. */
export interface SwitchboardTurn extends TranscriptTurn {
  sessionId: string;
  /** Session title at event time (kept after soft-close) */
  sessionTitle?: string;
  agent: AgentKind;
  /** True when the session folder still exists and can be reopened */
  navigable: boolean;
}
