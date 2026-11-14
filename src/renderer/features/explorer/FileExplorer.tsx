import type { Session } from "../../../shared/session";
import { FileTree } from "./FileTree";
import { projectFolderName } from "./projectFolderName";
import { useExplorerRestored } from "./useExplorerRestored";
import "./explorer.css";

/** File Explorer mode's rail body: the active session's project folder. */
export function FileExplorer({ session }: { session: Session | null }) {
  const sessionId = session?.cwd ? session.id : null;
  const restored = useExplorerRestored(sessionId);
  if (!session || !sessionId) {
    return (
      <div className="explorer">
        <div className="explorer-empty">Select a session to browse its files.</div>
      </div>
    );
  }
  return (
    <div className="explorer">
      <div className="explorer-header" title={session.cwd}>{projectFolderName(session.cwd)}</div>
      {restored ? <FileTree key={sessionId} sessionId={sessionId} /> : null}
    </div>
  );
}
