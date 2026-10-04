import { useMemo, useState } from "react";
import type { FileChange } from "../../../shared/types";
import { FileDiffFrame } from "./FileDiffFrame";
import { diffLines } from "./diffLines";
import { markdownPreviewText } from "./isMarkdownFile";

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
  const previewText = markdownPreviewText(change) ?? undefined;
  const frame = { title: heading, path: change.path, sessionId, previewText, onTitleClick };
  const hasText = typeof change.oldText === "string" || typeof change.newText === "string";
  const lines = useMemo(
    () => (hasText ? diffLines(change.oldText ?? "", change.newText ?? "") : []),
    [change.oldText, change.newText, hasText],
  );
  const visible = useMemo(() => {
    if (showAll) return lines;
    return lines.filter((line, index) => line.kind !== "context" ||
      lines.slice(Math.max(0, index - 3), index + 4).some((nearby) => nearby.kind !== "context"));
  }, [lines, showAll]);
  const limit = showAll ? visible.length : 500;

  if (!hasText) {
    return (
      <FileDiffFrame {...frame}>
        <div className="file-diff-note">Diff not provided</div>
      </FileDiffFrame>
    );
  }
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
