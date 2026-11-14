import { memo } from "react";
import { baseName } from "./baseName";
import { useFileBuffer } from "./useFileBuffer";

interface Props {
  sessionId: string;
  path: string;
  active: boolean;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
}

/** One editor tab: a dot while unsaved (× on hover), middle-click closes. */
export const EditorTab = memo(function EditorTab({ sessionId, path, active, onActivate, onClose }: Props) {
  const buffer = useFileBuffer(sessionId, path);
  const dirty = buffer?.kind === "text" && buffer.dirty;
  const name = baseName(path);

  return (
    <div
      role="tab"
      aria-selected={active}
      className={`editor-tab${active ? " active" : ""}${dirty ? " dirty" : ""}`}
      title={path}
      data-path={path}
      onClick={() => onActivate(path)}
      onMouseDown={(event) => {
        if (event.button === 1) event.preventDefault();
      }}
      onAuxClick={(event) => {
        if (event.button !== 1) return;
        event.preventDefault();
        onClose(path);
      }}
    >
      <span className="editor-tab-name">{name}</span>
      <button
        type="button"
        className="editor-tab-close"
        aria-label={dirty ? `Close ${name} (unsaved)` : `Close ${name}`}
        onClick={(event) => {
          event.stopPropagation();
          onClose(path);
        }}
      >
        <span className="editor-tab-dot" aria-hidden="true" />
        <span className="editor-tab-x" aria-hidden="true">✕</span>
      </button>
    </div>
  );
});
