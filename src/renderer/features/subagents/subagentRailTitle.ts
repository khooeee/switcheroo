import type { SubagentRailInfo } from "./SubagentRailInfo";

/** Right-rail heading (and saved-markdown title) for a subagent transcript. */
export function subagentRailTitle(subagent: SubagentRailInfo): string {
  return `Subagent · ${subagent.name}`;
}
