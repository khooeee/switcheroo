import { useState } from "react";
import type { FileChange } from "../../../shared/types";
import { fileChangeLabel } from "../../../shared/fileChangeLabel";
import { FileDiff } from "./FileDiff";
import { OpenInCursor } from "./OpenInCursor";
import "./fileChanges.css";

interface Props {
  changes: FileChange[];
  status?: string;
  cwd?: string;
  sessionId?: string;
}

export function FileChanges({ changes, status, cwd, sessionId }: Props) {
  return <div className="file-changes">
    {changes.map((change, index) => <FileEntry key={`${change.path}:${index}`} change={change} status={status} cwd={cwd} sessionId={sessionId} />)}
  </div>;
}

function FileEntry({ change, status, cwd, sessionId }: { change: FileChange; status?: string; cwd?: string; sessionId?: string }) {
  const [open, setOpen] = useState(false);
  const prefix = cwd?.replace(/[\\/]$/, "");
  const path = prefix && (change.path.startsWith(`${prefix}/`) || change.path.startsWith(`${prefix}\\`))
    ? change.path.slice(prefix.length + 1) : change.path;
  const label = fileChangeLabel({ ...change, path }, status);
  const hasContent = typeof change.oldText === "string" || typeof change.newText === "string";
  return (
    <div className="file-entry">
      {hasContent ? (
        <details className="file-change" onToggle={(event) => setOpen(event.currentTarget.open)}>
          <summary data-tooltip={change.path}>{label}</summary>
          {open && <FileDiff change={change} />}
        </details>
      ) : <div className="file-change-label" data-tooltip={change.path}>
        {label}<span className="file-diff-note"> · Diff not provided</span>
      </div>}
      {sessionId && <OpenInCursor sessionId={sessionId} filePath={change.path} />}
    </div>
  );
}
