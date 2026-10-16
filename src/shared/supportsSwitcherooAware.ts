import type { AgentKind } from "./agentKind";

/** Agents that can be made Switcheroo aware (Claude, Codex). */
export function supportsSwitcherooAware(agent: AgentKind | undefined): boolean {
  return agent === "claude" || agent === "codex";
}
