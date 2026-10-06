import { useContext } from "react";
import { SubagentOpenContext } from "./SubagentOpenContext";
import "../copy/eventActionButton.css";
import "./subagents.css";

/** Opens a subagent row's own transcript in the right rail. */
export function OpenSubagentButton({ sessionId, subagentId }: { sessionId: string; subagentId: string }) {
  const openSubagent = useContext(SubagentOpenContext);
  return (
    <button
      type="button"
      className="event-action"
      aria-label="Open Subagent"
      data-tooltip="Open Subagent"
      data-tooltip-align="center"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openSubagent(sessionId, subagentId);
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M15 3v18" />
      </svg>
    </button>
  );
}
