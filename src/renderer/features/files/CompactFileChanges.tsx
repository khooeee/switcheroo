import { useCallback, useMemo, useState } from "react";
import type { FileChange } from "../../../shared/types";
import { coalesceFileChanges } from "./coalesceFileChanges";
import { FileDiff } from "./FileDiff";
import { markdownPreviewText } from "./isMarkdownFile";
import { OpenMarkdownPreview } from "./OpenMarkdownPreview";
import { relativeChangePath } from "./relativeChangePath";

/** Filename chips under the final assistant message; click to toggle a coalesced diff. */
export function CompactFileChanges({
  changes,
  cwd,
  sessionId,
}: {
  changes: FileChange[];
  cwd?: string;
  sessionId?: string;
}) {
  const unique = useMemo(() => coalesceFileChanges(changes), [changes]);
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
        {unique.map((change, index) => (
          <FileChip
            key={change.path}
            change={change}
            cwd={cwd}
            index={index}
            expanded={open.has(index)}
            onToggle={toggle}
          />
        ))}
      </div>
      {unique.map((change, index) =>
        open.has(index) ? (
          <OpenDiff
            key={`panel:${change.path}`}
            change={change}
            cwd={cwd}
            sessionId={sessionId}
            index={index}
            onCollapse={toggle}
          />
        ) : null,
      )}
    </div>
  );
}

function OpenDiff({
  change,
  cwd,
  sessionId,
  index,
  onCollapse,
}: {
  change: FileChange;
  cwd?: string;
  sessionId?: string;
  index: number;
  onCollapse: (index: number) => void;
}) {
  return (
    <FileDiff
      change={change}
      title={relativeChangePath(change.path, cwd)}
      sessionId={sessionId}
      onTitleClick={() => onCollapse(index)}
    />
  );
}

function FileChip({
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
  const path = relativeChangePath(change.path, cwd);
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
          (<OpenMarkdownPreview path={change.path} text={preview} />)
        </span>
      ) : null}
    </span>
  );
}
