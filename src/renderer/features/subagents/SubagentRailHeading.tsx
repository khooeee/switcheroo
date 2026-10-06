import type { SubagentRailInfo } from "./SubagentRailInfo";
import { SubagentStateIcon } from "./SubagentStateIcon";
import "./subagents.css";

/** Right-rail title for a subagent transcript: name, state, and the task it was given. */
export function SubagentRailHeading({ subagent }: { subagent: SubagentRailInfo }) {
  return (
    <div className="subagent-rail-heading">
      <h2>
        <SubagentStateIcon state={subagent.state} />
        <span className="subagent-rail-name">Subagent · {subagent.name}</span>
      </h2>
      <div className="subagent-rail-meta">
        {subagent.state ?? "unknown"}
        {subagent.task ? ` · ${subagent.task}` : ""}
      </div>
    </div>
  );
}
