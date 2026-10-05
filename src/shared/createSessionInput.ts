import type { AgentKind } from "./agentKind";

export interface CreateSessionInput {
  agent: AgentKind;
  cwd: string;
  title?: string;
  /** When true, send a visible bootstrap prompt about the control API after the session is ready. */
  switcherooAware?: boolean;
  /** When true, add the session to the top of the pinned rail section. */
  pin?: boolean;
}
