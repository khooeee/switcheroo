import { ipcMain } from "electron";
import type { SessionManager } from "../sessions/SessionManager";
import { listSessionDir } from "./listSessionDir";
import { readSessionFile } from "./readSessionFile";
import { writeSessionFile } from "./writeSessionFile";

/** File explorer and editor channels; every path is relative to the session's cwd. */
export function registerFileIpc(sessions: SessionManager): void {
  const cwdOf = (sessionId: string): string => {
    const session = sessions.getSession(sessionId);
    if (!session) throw new Error("This agent session no longer exists.");
    return session.cwd;
  };

  ipcMain.handle("files:list", (_e, sessionId: string, relPath: string) =>
    listSessionDir(cwdOf(sessionId), relPath),
  );
  ipcMain.handle("files:read", (_e, sessionId: string, relPath: string) =>
    readSessionFile(cwdOf(sessionId), relPath),
  );
  ipcMain.handle(
    "files:write",
    (_e, sessionId: string, relPath: string, text: string, baseMtimeMs: number | null) =>
      writeSessionFile(cwdOf(sessionId), relPath, text, baseMtimeMs),
  );
}
