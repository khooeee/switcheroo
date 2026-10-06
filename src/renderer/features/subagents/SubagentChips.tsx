import { memo, useContext, useState } from "react";
import type { TranscriptItem } from "../../../shared/transcript";
import { OpenSubagentIdContext } from "./OpenSubagentIdContext";
import { SubagentOpenContext } from "./SubagentOpenContext";
import { SubagentStateIcon } from "./SubagentStateIcon";
import "./subagents.css";

/** Chips beyond this collapse into "+N" until expanded. */
const MAX_VISIBLE = 4;

/** A turn's subagents between its user message and final reply; click one to open it in the right rail. */
export const SubagentChips = memo(function SubagentChips({
  sessionId,
  rows,
}: {
  sessionId: string;
  rows: TranscriptItem[];
}) {
  const [expanded, setExpanded] = useState(false);
  if (!rows.length) return null;
  const visible = expanded ? rows : rows.slice(0, MAX_VISIBLE);
  const hidden = rows.length - visible.length;

  return (
    <div className={`subagent-chips${expanded ? " expanded" : ""}`} role="toolbar" aria-label="Subagents">
      <span className="subagent-chips-label">Subagents</span>
      {visible.map((row) => (
        <SubagentChip key={row.subagentId} sessionId={sessionId} row={row} />
      ))}
      {hidden > 0 || expanded ? (
        <button type="button" className="subagent-chip more" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Less" : `+${hidden}`}
        </button>
      ) : null}
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
  const tooltip = row.toolTitle ? `${row.toolTitle}\n${state}` : state;
  return (
    <button
      type="button"
      className={`subagent-chip ${state}${active ? " active" : ""}`}
      aria-pressed={active}
      aria-label={`${row.text}, ${state}`}
      data-tooltip={tooltip}
      onClick={() => openSubagent(sessionId, row.subagentId!)}
    >
      <SubagentStateIcon state={row.toolStatus} />
      <span className="subagent-chip-name">{row.text}</span>
    </button>
  );
});
