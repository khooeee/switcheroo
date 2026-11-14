import { BrowserWindow, ipcMain } from "electron";
import type { SessionManager } from "../sessions/SessionManager";
import { parsePersistedExplorer } from "../storage/parsePersistedExplorer";
import { loadSessionExplorer, saveSessionExplorer } from "../storage/sessionExplorer";
import { confirmUnsavedChanges } from "./confirmUnsavedChanges";
import { listSessionDir } from "./listSessionDir";
import { listSessionFiles } from "./listSessionFiles";
import { readSessionFile } from "./readSessionFile";
import { saveSessionFileAs } from "./saveSessionFileAs";
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
  ipcMain.handle("files:listAll", (_e, sessionId: string) => listSessionFiles(cwdOf(sessionId)));
  ipcMain.handle("files:read", (_e, sessionId: string, relPath: string) =>
    readSessionFile(cwdOf(sessionId), relPath),
  );
  ipcMain.handle(
    "files:write",
    (_e, sessionId: string, relPath: string, text: string, baseMtimeMs: number | null) =>
      writeSessionFile(cwdOf(sessionId), relPath, text, baseMtimeMs),
  );
  ipcMain.handle("files:saveAs", (event, sessionId: string, suggested: string, text: string) =>
    saveSessionFileAs(BrowserWindow.fromWebContents(event.sender), cwdOf(sessionId), suggested, text),
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
  // Session ids name folders on disk; only ids of known sessions get through.
  ipcMain.handle("files:getExplorer", (_e, sessionId: string) => {
    cwdOf(sessionId);
    return loadSessionExplorer(sessionId);
  });
  ipcMain.handle("files:saveExplorer", async (_e, sessionId: string, state: unknown) => {
    cwdOf(sessionId);
    const parsed = parsePersistedExplorer(state);
    if (parsed) await saveSessionExplorer(sessionId, parsed);
  });
  return watcher;
}
