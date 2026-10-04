import type { ReactNode } from "react";
import { OpenInCursor } from "./OpenInCursor";
import { OpenMarkdownPreview } from "./OpenMarkdownPreview";

/** Bordered diff shell: clickable header and optional (Open in Cursor) / (Preview). */
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
      <div
        className={`file-diff-header${onTitleClick ? " collapsible" : ""}`}
        title={onTitleClick ? `Collapse ${title}` : title}
        role={onTitleClick ? "button" : undefined}
        tabIndex={onTitleClick ? 0 : undefined}
        onClick={
          onTitleClick
            ? (event) => {
                if ((event.target as HTMLElement).closest("button, a")) return;
                onTitleClick();
              }
            : undefined
        }
        onKeyDown={
          onTitleClick
            ? (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                if ((event.target as HTMLElement).closest("button, a")) return;
                event.preventDefault();
                onTitleClick();
              }
            : undefined
        }
      >
        <span className="file-diff-title">{title}</span>
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
