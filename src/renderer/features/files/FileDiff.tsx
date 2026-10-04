import { useMemo, useState, type ReactNode } from "react";
import { diffLines } from "./diffLines";
import type { FileChange } from "../../../shared/types";

export function FileDiff({ change, title }: { change: FileChange; title?: string }) {
  const [showAll, setShowAll] = useState(false);
  const heading = title ?? change.path;
  const lines = useMemo(() => diffLines(change.oldText ?? "", change.newText ?? ""), [change.oldText, change.newText]);
  const visible = useMemo(() => {
    if (showAll) return lines;
    return lines.filter((line, index) => line.kind !== "context" ||
      lines.slice(Math.max(0, index - 3), index + 4).some((nearby) => nearby.kind !== "context"));
  }, [lines, showAll]);
  const limit = showAll ? visible.length : 500;

  if (change.oldText === undefined || change.newText === undefined) {
    return (
      <DiffFrame title={heading}>
        <div className="file-diff-note">
          {change.oldText === undefined ? "Previous content not provided" : "New content not provided"}
        </div>
        <pre>{change.newText ?? change.oldText}</pre>
      </DiffFrame>
    );
  }
  if (!lines.some((line) => line.kind !== "context")) {
    return (
      <DiffFrame title={heading}>
        <div className="file-diff-note">No content changes</div>
      </DiffFrame>
    );
  }
  return (
    <DiffFrame title={heading}>
      <pre aria-label={`Changes to ${change.path}`}>
        {visible.slice(0, limit).map((line, index) => (
          <span className={`diff-line ${line.kind}`} key={index}>
            <span className="diff-line-number">{line.oldLine ?? ""}</span>
            <span className="diff-line-number">{line.newLine ?? ""}</span>
            <span className="diff-marker">{line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " "}</span>
            <span>{line.text || " "}</span>
          </span>
        ))}
      </pre>
      {!showAll && (visible.length < lines.length || visible.length > limit) && (
        <button type="button" className="file-diff-more" onClick={() => setShowAll(true)}>Show all lines</button>
      )}
    </DiffFrame>
  );
}

function DiffFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="file-diff">
      <div className="file-diff-header" title={title}>{title}</div>
      {children}
    </div>
  );
}
