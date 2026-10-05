import { useState } from "react";
import type { FileChange } from "../../../shared/fileChange";
import { fileChangeLabel } from "../../../shared/fileChangeLabel";
import { FileDiff } from "./FileDiff";
import { relativeChangePath } from "./relativeChangePath";

/** Verbose tool-call file rows used in turn details. */
export function DetailedFileChanges({
  changes,
  cwd,
  sessionId,
  status,
}: {
  changes: FileChange[];
  cwd?: string;
  sessionId?: string;
  status?: string;
}) {
  return (
    <div className="file-changes detailed">
      {changes.map((change, index) => (
        <DetailedFileEntry
          key={`${change.path}:${index}`}
          change={change}
          status={status}
          cwd={cwd}
          sessionId={sessionId}
        />
      ))}
    </div>
  );
}

function DetailedFileEntry({
  change,
  status,
  cwd,
  sessionId,
}: {
  change: FileChange;
  status?: string;
  cwd?: string;
  sessionId?: string;
}) {
  const [open, setOpen] = useState(false);
  const path = relativeChangePath(change.path, cwd);
  const label = fileChangeLabel({ ...change, path }, status);
  const hasText = typeof change.oldText === "string" || typeof change.newText === "string";
  return (
    <div className="file-entry">
      {hasText ? (
        <details className="file-change" onToggle={(event) => setOpen(event.currentTarget.open)}>
          <summary data-tooltip={change.path}>{label}</summary>
          {open && <FileDiff change={change} title={path} sessionId={sessionId} />}
        </details>
      ) : (
        <div className="file-change-label" data-tooltip={change.path}>
          {label}<span className="file-diff-note"> · Diff not provided</span>
        </div>
      )}
    </div>
  );
}
