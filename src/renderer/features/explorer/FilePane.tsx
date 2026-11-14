import { useEffect } from "react";
import type { Session } from "../../../shared/session";
import { closeFileTab } from "../editor/closeFileTab";
import { EditorTabs } from "../editor/EditorTabs";
import { FileEditor } from "../editor/FileEditor";
import { FileHeader } from "../editor/FileHeader";
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
  const { openFiles, activeFile } = useExplorerState(sessionId);

  // Cmd+W in File Explorer mode closes the active tab instead of the session.
  useEffect(() => {
    const onCloseFile = () => {
      if (activeFile) void closeFileTab(sessionId, activeFile);
    };
    window.addEventListener("switcheroo:close-file", onCloseFile);
    return () => window.removeEventListener("switcheroo:close-file", onCloseFile);
  }, [sessionId, activeFile]);

  if (!restored) return <section className="panel" />;
  return (
    <section className="panel file-pane">
      {openFiles.length > 0 ? (
        <EditorTabs sessionId={sessionId} openFiles={openFiles} activeFile={activeFile} />
      ) : null}
      {activeFile ? (
        <>
          <FileHeader sessionId={sessionId} path={activeFile} />
          <div className="file-editor">
            <FileEditor sessionId={sessionId} path={activeFile} />
          </div>
        </>
      ) : (
        <div className="empty">Double-click a file to open it.</div>
      )}
    </section>
  );
}
