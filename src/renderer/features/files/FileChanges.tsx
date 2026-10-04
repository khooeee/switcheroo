import { useCallback, useState } from "react";
import type { FileChange } from "../../../shared/types";
import { fileChangeLabel } from "../../../shared/fileChangeLabel";
import { FileDiff, FileDiffFrame } from "./FileDiff";
import { markdownPreviewText } from "./isMarkdownFile";
import { OpenMarkdownPreview } from "./OpenMarkdownPreview";
import "./fileChanges.css";

interface Props {
  changes: FileChange[];
  cwd?: string;
  sessionId?: string;
  status?: string;
  /** Filename chips (final assistant). Off = verbose tool-call labels in turn details. */
  compact?: boolean;
}

export function FileChanges({ changes, cwd, sessionId, status, compact }: Props) {
  if (compact) {
    return <CompactFileChanges changes={changes} cwd={cwd} sessionId={sessionId} />;
  }
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

function relativePath(path: string, cwd?: string): string {
  const prefix = cwd?.replace(/[\\/]$/, "");
  if (prefix && (path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}\\`))) {
    return path.slice(prefix.length + 1);
  }
  return path;
}

function CompactFileChanges({
  changes,
  cwd,
  sessionId,
}: {
  changes: FileChange[];
  cwd?: string;
  sessionId?: string;
}) {
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());
  const toggle = useCallback((index: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);
  return (
    <div className="file-changes compact">
      <div className="file-change-names">
        <span className="file-change-label-prefix">Changes:</span>
        {changes.map((change, index) => (
          <FileName
            key={`${change.path}:${index}`}
            change={change}
            cwd={cwd}
            index={index}
            expanded={open.has(index)}
            onToggle={toggle}
          />
        ))}
      </div>
      {changes.map((change, index) =>
        open.has(index) ? (
          <FilePanel
            key={`panel:${change.path}:${index}`}
            change={change}
            title={relativePath(change.path, cwd)}
            sessionId={sessionId}
            index={index}
            onCollapse={toggle}
          />
        ) : null,
      )}
    </div>
  );
}

function FileName({
  change,
  cwd,
  index,
  expanded,
  onToggle,
}: {
  change: FileChange;
  cwd?: string;
  index: number;
  expanded: boolean;
  onToggle: (index: number) => void;
}) {
  const path = relativePath(change.path, cwd);
  const preview = markdownPreviewText(change);
  return (
    <span className="file-change-item">
      <button
        type="button"
        className="file-change-name"
        data-tooltip={change.path}
        aria-expanded={expanded}
        onClick={() => onToggle(index)}
      >
        {path}
      </button>
      {preview != null ? (
        <span className="file-change-preview-wrap">
          (
          <OpenMarkdownPreview path={change.path} text={preview} />
          )
        </span>
      ) : null}
    </span>
  );
}

function FilePanel({
  change,
  title,
  sessionId,
  index,
  onCollapse,
}: {
  change: FileChange;
  title: string;
  sessionId?: string;
  index: number;
  onCollapse: (index: number) => void;
}) {
  const hasContent = typeof change.oldText === "string" || typeof change.newText === "string";
  const collapse = () => onCollapse(index);
  const previewText = markdownPreviewText(change) ?? undefined;
  return (
    <div className="file-change-panel">
      {hasContent ? (
        <FileDiff
          change={change}
          title={title}
          sessionId={sessionId}
          onTitleClick={collapse}
        />
      ) : (
        <FileDiffFrame
          title={title}
          path={change.path}
          sessionId={sessionId}
          previewText={previewText}
          onTitleClick={collapse}
        >
          <div className="file-diff-note">Diff not provided</div>
        </FileDiffFrame>
      )}
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
  const path = relativePath(change.path, cwd);
  const label = fileChangeLabel({ ...change, path }, status);
  const hasContent = typeof change.oldText === "string" || typeof change.newText === "string";
  return (
    <div className="file-entry">
      {hasContent ? (
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
