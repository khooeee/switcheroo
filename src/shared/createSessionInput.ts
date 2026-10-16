import type { AgentKind } from "./agentKind";

export interface CreateSessionInput {
  agent: AgentKind;
  cwd: string;
  title?: string;
  /** Tell the agent about the control API: session instructions for Claude/Codex, else a visible bootstrap prompt. */
  switcherooAware?: boolean;
  /** When true, add the session to the top of the pinned rail section. */
  pin?: boolean;
}
