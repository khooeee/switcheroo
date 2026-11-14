import { useCallback, useEffect, useRef } from "react";
import { explorerStore } from "../explorer/explorerStore";
import { closeFileTab } from "./closeFileTab";
import { EditorTab } from "./EditorTab";

interface Props {
  sessionId: string;
  openFiles: readonly string[];
  activeFile: string | null;
  previewFile: string | null;
}

/** The session's open files, left to right; the active tab scrolls into view. Double-click keeps the preview tab. */
export function EditorTabs({ sessionId, openFiles, activeFile, previewFile }: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const onActivate = useCallback((path: string) => explorerStore.activateFile(sessionId, path), [sessionId]);
  const onPin = useCallback((path: string) => explorerStore.pinFile(sessionId, path), [sessionId]);
  const onClose = useCallback((path: string) => void closeFileTab(sessionId, path), [sessionId]);

  useEffect(() => {
    stripRef.current?.querySelector(".editor-tab.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeFile]);

  return (
    <div ref={stripRef} className="editor-tabs" role="tablist" aria-label="Open files">
      {openFiles.map((path) => (
        <EditorTab
          key={path}
          sessionId={sessionId}
          path={path}
          active={path === activeFile}
          preview={path === previewFile}
          onActivate={onActivate}
          onPin={onPin}
          onClose={onClose}
        />
      ))}
    </div>
  );
}
