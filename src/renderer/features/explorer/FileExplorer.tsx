import type { Session } from "../../../shared/session";
import { projectFolderName } from "./projectFolderName";
import "./explorer.css";

/** File Explorer mode's rail body: the active session's project folder. */
export function FileExplorer({ session }: { session: Session | null }) {
  if (!session?.cwd) {
    return (
      <div className="explorer">
        <div className="explorer-empty">Select a session to browse its files.</div>
      </div>
    );
  }
  return (
    <div className="explorer">
      <div className="explorer-header" title={session.cwd}>{projectFolderName(session.cwd)}</div>
    </div>
  );
}
