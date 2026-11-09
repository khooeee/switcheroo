import type { AgentKind } from "./agentKind";

export type SessionStatus = "idle" | "connecting" | "ready" | "running" | "error";

export interface SessionUsage {
  used: number;
  size: number;
  cost?: { amount: number; currency: string };
}

/** Display names of the agent's current model and reasoning effort (ACP session config options). */
export interface SessionModelConfig {
  model?: string;
  effort?: string;
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
  /** Current model and effort from ACP config options (persisted in session meta). */
  modelConfig?: SessionModelConfig;
  /** Started by a cron run (persisted); forks of it are the user's own. */
  cron?: boolean;
  /** Take the agent's generated title (persisted); cleared when the user renames the session. */
  autoTitle?: boolean;
}
