import type { SubagentRailInfo } from "./SubagentRailInfo";
import "./subagents.css";

/** Right-rail title for a subagent transcript: its name and state (e.g. "Completed"). */
export function SubagentRailHeading({ subagent }: { subagent: SubagentRailInfo }) {
  const state = subagent.state ?? "unknown";
  return (
    <div className="subagent-rail-heading">
      <h2 className="subagent-rail-name">Subagent · {subagent.name}</h2>
      <div className="subagent-rail-meta">{state.charAt(0).toUpperCase() + state.slice(1)}</div>
    </div>
  );
}
