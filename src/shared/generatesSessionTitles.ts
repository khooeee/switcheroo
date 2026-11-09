import type { AgentKind } from "./agentKind";

/** Agents that title a session from its first prompt (ACP `session_info_update`); pi only on `/name`. */
export function generatesSessionTitles(agent: AgentKind | undefined): boolean {
  return agent !== undefined && agent !== "pi";
}
