import { BrowserWindow, ipcMain } from "electron";
import type { SessionManager } from "../sessions/SessionManager";
import { confirmUnsavedChanges } from "./confirmUnsavedChanges";
import { listSessionDir } from "./listSessionDir";
import { readSessionFile } from "./readSessionFile";
import { SessionFileWatcher } from "./SessionFileWatcher";
import { writeSessionFile } from "./writeSessionFile";

/** File explorer and editor channels; every path is relative to the session's cwd. Returns the watcher to dispose on quit. */
export function registerFileIpc(sessions: SessionManager): SessionFileWatcher {
  const watcher = new SessionFileWatcher();
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
  ipcMain.handle("files:confirmUnsaved", (event, names: string[]) =>
    confirmUnsavedChanges(BrowserWindow.fromWebContents(event.sender), names),
  );
  ipcMain.handle("files:watch", (event, sessionId: string) => {
    watcher.watch(sessionId, cwdOf(sessionId), event.sender);
  });
  ipcMain.handle("files:unwatch", (_e, sessionId: string) => {
    watcher.unwatch(sessionId);
  });
  return watcher;
}
