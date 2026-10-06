import { memo, useContext } from "react";
import type { TranscriptItem } from "../../../shared/transcript";
import { OpenSubagentIdContext } from "./OpenSubagentIdContext";
import { SubagentOpenContext } from "./SubagentOpenContext";
import { SubagentStateIcon } from "./SubagentStateIcon";
import "./subagents.css";

/** A turn's subagents between its user message and final reply; click one to open it in the right rail. */
export const SubagentChips = memo(function SubagentChips({
  sessionId,
  rows,
}: {
  sessionId: string;
  rows: TranscriptItem[];
}) {
  if (!rows.length) return null;
  return (
    <div className="subagent-chips" role="toolbar" aria-label="Subagents">
      <span className="subagent-chips-label">Subagents:</span>
      {rows.map((row) => (
        <SubagentChip key={row.subagentId} sessionId={sessionId} row={row} />
      ))}
    </div>
  );
});

const SubagentChip = memo(function SubagentChip({
  sessionId,
  row,
}: {
  sessionId: string;
  row: TranscriptItem;
}) {
  const openSubagent = useContext(SubagentOpenContext);
  const active = useContext(OpenSubagentIdContext) === row.subagentId;
  const state = row.toolStatus ?? "unknown";
  return (
    <button
      type="button"
      className={`subagent-chip ${state}${active ? " active" : ""}`}
      aria-pressed={active}
      aria-label={`${row.text}, ${state}`}
      onClick={() => openSubagent(sessionId, row.subagentId!)}
    >
      <SubagentStateIcon state={row.toolStatus} />
      <span className="subagent-chip-name">{row.text}</span>
    </button>
  );
});
