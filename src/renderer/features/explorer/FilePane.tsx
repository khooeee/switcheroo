import { useEffect } from "react";
import type { Session } from "../../../shared/session";
import { closeFileTab } from "../editor/closeFileTab";
import { EditorTabs } from "../editor/EditorTabs";
import { FileEditor } from "../editor/FileEditor";
import { FileHeader } from "../editor/FileHeader";
import { fileBufferStore } from "../editor/fileBufferStore";
import { GoToFile } from "../goToFile/GoToFile";
import { modLabel } from "../shortcuts/modLabel";
import { explorerStore } from "./explorerStore";
import { useExplorerRestored } from "./useExplorerRestored";
import { useExplorerState } from "./useExplorerState";
import { useOpenFileDialog } from "./useOpenFileDialog";
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
  useOpenFileDialog(sessionId);
  const restored = useExplorerRestored(sessionId);
  const { openFiles, activeFile, previewFile } = useExplorerState(sessionId);

  // Cmd+W / Cmd+S / Ctrl+Tab in File Explorer mode act on the tabs (see useFileShortcuts).
  useEffect(() => {
    const onCloseFile = () => {
      if (activeFile) void closeFileTab(sessionId, activeFile);
    };
    const onSaveFile = () => {
      if (activeFile) void fileBufferStore.save(sessionId, activeFile);
    };
    const onNextFile = () => explorerStore.cycleFile(sessionId, 1);
    const onPrevFile = () => explorerStore.cycleFile(sessionId, -1);
    window.addEventListener("switcheroo:close-file", onCloseFile);
    window.addEventListener("switcheroo:save-file", onSaveFile);
    window.addEventListener("switcheroo:next-file", onNextFile);
    window.addEventListener("switcheroo:prev-file", onPrevFile);
    return () => {
      window.removeEventListener("switcheroo:close-file", onCloseFile);
      window.removeEventListener("switcheroo:save-file", onSaveFile);
      window.removeEventListener("switcheroo:next-file", onNextFile);
      window.removeEventListener("switcheroo:prev-file", onPrevFile);
    };
  }, [sessionId, activeFile]);

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
        <div className="empty">Click a file to open it, or press {modLabel("P")} to search.</div>
      )}
      <GoToFile key={sessionId} sessionId={sessionId} />
    </section>
  );
}
