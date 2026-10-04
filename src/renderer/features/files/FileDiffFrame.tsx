import type { ReactNode } from "react";
import { OpenInCursor } from "./OpenInCursor";
import { OpenMarkdownPreview } from "./OpenMarkdownPreview";

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
            (<OpenInCursor sessionId={sessionId} filePath={path} />)
          </span>
        ) : null}
        {previewText != null ? (
          <span className="file-diff-header-action">
            (<OpenMarkdownPreview path={path} text={previewText} />)
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
