import { useMemo, useState, type ReactNode } from "react";
import { diffLines } from "./diffLines";
import type { FileChange } from "../../../shared/types";
import { markdownPreviewText } from "./isMarkdownFile";
import { OpenInCursor } from "./OpenInCursor";
import { OpenMarkdownPreview } from "./OpenMarkdownPreview";

export function FileDiff({
  change,
  title,
  sessionId,
  onTitleClick,
}: {
  change: FileChange;
  title?: string;
  sessionId?: string;
  onTitleClick?: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const heading = title ?? change.path;
  const previewText = markdownPreviewText(change);
  const lines = useMemo(() => diffLines(change.oldText ?? "", change.newText ?? ""), [change.oldText, change.newText]);
  const visible = useMemo(() => {
    if (showAll) return lines;
    return lines.filter((line, index) => line.kind !== "context" ||
      lines.slice(Math.max(0, index - 3), index + 4).some((nearby) => nearby.kind !== "context"));
  }, [lines, showAll]);
  const limit = showAll ? visible.length : 500;
  const frame = {
    title: heading,
    path: change.path,
    sessionId,
    previewText: previewText ?? undefined,
    onTitleClick,
  };

  if (change.oldText === undefined || change.newText === undefined) {
    return (
      <FileDiffFrame {...frame}>
        <div className="file-diff-note">
          {change.oldText === undefined ? "Previous content not provided" : "New content not provided"}
        </div>
        <pre>{change.newText ?? change.oldText}</pre>
      </FileDiffFrame>
    );
  }
  if (!lines.some((line) => line.kind !== "context")) {
    return (
      <FileDiffFrame {...frame}>
        <div className="file-diff-note">No content changes</div>
      </FileDiffFrame>
    );
  }
  return (
    <FileDiffFrame {...frame}>
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
    </FileDiffFrame>
  );
}

/** Bordered diff shell: clickable filename and optional (Open in Cursor) / (Preview). */
export function FileDiffFrame({
  title,
  path,
  sessionId,
  previewText,
  onTitleClick,
  children,
}: {
  title: string;
  path: string;
  sessionId?: string;
  previewText?: string;
  onTitleClick?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="file-diff">
      <div className="file-diff-header">
        {onTitleClick ? (
          <button type="button" className="file-diff-title" title={title} onClick={onTitleClick}>
            {title}
          </button>
        ) : (
          <span className="file-diff-title" title={title}>{title}</span>
        )}
        {sessionId ? (
          <span className="file-diff-header-action">
            (
            <OpenInCursor sessionId={sessionId} filePath={path} />
            )
          </span>
        ) : null}
        {previewText != null ? (
          <span className="file-diff-header-action">
            (
            <OpenMarkdownPreview path={path} text={previewText} />
            )
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
