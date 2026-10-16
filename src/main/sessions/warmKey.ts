import type { AgentKind } from "../../shared/agentKind";
import { supportsSwitcherooAware } from "../../shared/supportsSwitcherooAware";

/** Warm pool slot for a new session; Claude and Codex keep a separate Switcheroo aware slot. */
export function warmKey(agent: AgentKind, aware: boolean): string {
  return aware && supportsSwitcherooAware(agent) ? `${agent}:aware` : agent;
}
