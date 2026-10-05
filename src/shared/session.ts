import type { AgentKind } from "./agentKind";

export type SessionStatus = "idle" | "connecting" | "ready" | "running" | "error";

/** Child tab under a chat group (terminals now; browser/emulator later). */
export type SessionTab =
  | { tabId: string; kind: "terminal"; title: string; cwd: string };

export interface SessionUsage {
  used: number;
  size: number;
  cost?: { amount: number; currency: string };
}

export interface SlashCommand {
  name: string;
  description: string;
  hint?: string;
}

export interface Session {
  id: string;
  title: string;
  agent: AgentKind;
  cwd: string;
  /** ACP agent session id (not the Switcheroo session folder id). */
  agentSessionId: string | null;
  status: SessionStatus;
  supportsSteering?: boolean;
  /** Agent supports ACP `session/fork` (assumed until an agent of this kind connects). */
  supportsFork?: boolean;
  /** Fork can drop agent history after a transcript message, not just copy all of it. */
  supportsForkAtMessage?: boolean;
  error: string | null;
  createdAt: number;
  /** ACP slash commands advertised by the agent for this session. */
  slashCommands?: SlashCommand[];
  /** Context window usage from ACP usage_update (persisted in session meta). */
  usage?: SessionUsage;
  /** Child tabs (terminals, etc.) under this chat group. */
  tabs: SessionTab[];
  /** Whether child tabs are expanded in the rail. */
  tabsExpanded: boolean;
}
