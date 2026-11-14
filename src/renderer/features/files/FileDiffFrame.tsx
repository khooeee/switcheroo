import type { KeyboardEvent, ReactNode } from "react";
import { OpenInEditor } from "./OpenInEditor";
import { OpenMarkdownPreview } from "./OpenMarkdownPreview";

/** Bordered diff shell: clickable header, (Open in Editor) and optional (Preview). */
export function FileDiffFrame({
  title,
  path,
  sessionId,
  cwd,
  previewText,
  onTitleClick,
  children,
}: {
  title: string;
  path: string;
  sessionId: string;
  cwd: string;
  previewText?: string;
  onTitleClick?: () => void;
  children?: ReactNode;
}) {
  const collapseUnlessAction = onTitleClick
    ? (target: EventTarget | null) => {
        if ((target as HTMLElement | null)?.closest?.("button, a")) return;
        onTitleClick();
      }
    : undefined;

  const onKeyDown = onTitleClick
    ? (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if ((event.target as HTMLElement).closest("button, a")) return;
        event.preventDefault();
        onTitleClick();
      }
    : undefined;

  return (
    <div className="file-diff">
      <div
        className={`file-diff-header${onTitleClick ? " collapsible" : ""}`}
        title={onTitleClick ? `Collapse ${title}` : title}
        role={onTitleClick ? "button" : undefined}
        tabIndex={onTitleClick ? 0 : undefined}
        onClick={collapseUnlessAction ? (event) => collapseUnlessAction(event.target) : undefined}
        onKeyDown={onKeyDown}
      >
        <span className="file-diff-title">{title}</span>
        <span className="file-diff-header-action">
          (<OpenInEditor sessionId={sessionId} cwd={cwd} filePath={path} />)
        </span>
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
