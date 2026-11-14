import { useEffect } from "react";
import type { Session } from "../../../shared/session";
import { closeFileTab } from "../editor/closeFileTab";
import { EditorTabs } from "../editor/EditorTabs";
import { FileEditor } from "../editor/FileEditor";
import { FileHeader } from "../editor/FileHeader";
import { nextUntitledPath } from "../editor/nextUntitledPath";
import { saveFileAs } from "../editor/saveFileAs";
import { saveFileTab } from "../editor/saveFileTab";
import { GoToFile } from "../goToFile/GoToFile";
import { modLabel } from "../shortcuts/modLabel";
import { explorerStore } from "./explorerStore";
import { useExplorerRestored } from "./useExplorerRestored";
import { useExplorerState } from "./useExplorerState";
import "../editor/editor.css";

/** File Explorer mode's main pane: the active session's editor tabs and the open file. */
export function FilePane({ session }: { session: Session | null }) {
  if (!session) {
    return (
      <section className="panel">
        <div className="empty">Select a session to browse its files.</div>
      </section>
    );
  }
  return <SessionFiles sessionId={session.id} />;
}

function SessionFiles({ sessionId }: { sessionId: string }) {
  const restored = useExplorerRestored(sessionId);
  const { openFiles, activeFile, previewFile } = useExplorerState(sessionId);

  // Cmd+N / Cmd+W / Cmd+S / Cmd+Shift+S / Ctrl+Tab in File Explorer mode act on the tabs (see useFileShortcuts).
  useEffect(() => {
    const onActiveFile = (act: (path: string) => unknown) => () => {
      if (activeFile) void act(activeFile);
    };
    const commands: Array<[string, () => void]> = [
      // Not before the saved tabs are back: restoring never replaces a changed explorer.
      ["switcheroo:new-file", () => {
        if (restored) explorerStore.openFile(sessionId, nextUntitledPath(explorerStore.get(sessionId).openFiles));
      }],
      ["switcheroo:close-file", onActiveFile((path) => closeFileTab(sessionId, path))],
      ["switcheroo:save-file", onActiveFile((path) => saveFileTab(sessionId, path))],
      ["switcheroo:save-file-as", onActiveFile((path) => saveFileAs(sessionId, path))],
      ["switcheroo:next-file", () => explorerStore.cycleFile(sessionId, 1)],
      ["switcheroo:prev-file", () => explorerStore.cycleFile(sessionId, -1)],
    ];
    for (const [name, handler] of commands) window.addEventListener(name, handler);
    return () => {
      for (const [name, handler] of commands) window.removeEventListener(name, handler);
    };
  }, [sessionId, activeFile, restored]);

  if (!restored) return <section className="panel" />;
  return (
    <section className="panel file-pane">
      {openFiles.length > 0 ? (
        <EditorTabs sessionId={sessionId} openFiles={openFiles} activeFile={activeFile} previewFile={previewFile} />
      ) : null}
      {activeFile ? (
        <>
          <FileHeader sessionId={sessionId} path={activeFile} />
          <div className="file-editor">
            <FileEditor sessionId={sessionId} path={activeFile} />
          </div>
        </>
      ) : (
        <div className="empty">
          Click a file to open it, press {modLabel("P")} to search, or {modLabel("N")} for a new one.
        </div>
      )}
      <GoToFile key={sessionId} sessionId={sessionId} />
    </section>
  );
}
