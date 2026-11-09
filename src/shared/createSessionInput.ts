import type { AgentKind } from "./agentKind";

export interface CreateSessionInput {
  agent: AgentKind;
  cwd: string;
  title?: string;
  /** Tell the agent about the control API: session instructions for Claude/Codex, else a visible bootstrap prompt. */
  switcherooAware?: boolean;
  /** When true, add the session to the top of the pinned rail section. */
  pin?: boolean;
  /** Started by a cron run, not the user. */
  cron?: boolean;
  /** Replace `title` with the agent's generated title once it has one. */
  autoTitle?: boolean;
  /** Sent as the first prompt once the session starts. */
  prompt?: string;
}
