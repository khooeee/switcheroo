import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { trapModalTabFocus } from "../modals/trapModalTabFocus";
import { GithubMarkdown } from "./GithubMarkdown";
import "../modals/modal.css";
import "./markdownPreview.css";

interface Props {
  path: string;
  text: string;
  onClose: () => void;
}

/** Full-screen-ish dialog that renders a file the way GitHub's Preview tab does. */
export function MarkdownPreviewModal({ path, text, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  const name = path.replace(/^.*[\\/]/, "") || path;

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      const root = dialogRef.current;
      if (root) trapModalTabFocus(event, root);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal markdown-preview-modal"
        role="dialog"
        aria-label={`Markdown preview: ${name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="markdown-preview-header">
          <h3 className="markdown-preview-title" title={path}>{name}</h3>
          <button
            ref={closeRef}
            type="button"
            className="btn"
            aria-label="Close markdown preview"
            data-tooltip="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="markdown-preview-scroll">
          <GithubMarkdown text={text} theme={theme} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
