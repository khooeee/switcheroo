import { BrowserWindow, dialog, ipcMain } from "electron";
import { openInCursor } from "./openInCursor";
import { openFolderInCursor } from "./openFolderInCursor";
import { openTranscriptsFolder } from "./openTranscriptsFolder";
import { openSettingsFile } from "./openSettingsFile";
import { readClipboardPng } from "./readClipboardPng";
import { savePastedImage } from "./savePastedImage";
import { availableAgents } from "./acp/availableAgents";
import { showEditContextMenu } from "./showEditContextMenu";
import { showComposerContextMenu } from "./showComposerContextMenu";
import { resolveFolderPickerStart } from "./resolveFolderPickerStart";
import type { SessionManager } from "./sessions/SessionManager";
import type { ActiveTabId } from "../shared/activeTabId";
import type { AppSettings } from "../shared/appSettings";
import type { CreateSessionInput } from "../shared/createSessionInput";

type IpcContext = {
  sessions: SessionManager;
  getMainWindow: () => BrowserWindow | null;
  setActiveSessionUnread: (unread: boolean) => void;
};

/** Register every renderer → main `ipcMain.handle` channel. */
export function registerIpc({ sessions, getMainWindow, setActiveSessionUnread }: IpcContext): void {
  ipcMain.handle("files:openInCursor", async (_event, sessionId: string, filePath: string) => {
    await openInCursor(requireSession(sessionId).cwd, filePath);
  });
  ipcMain.handle("sessions:openInCursor", async (_event, sessionId: string) => {
    await openFolderInCursor(requireSession(sessionId).cwd);
  });
  ipcMain.handle("agents:available", () => availableAgents());
  ipcMain.handle(
    "edit:contextMenu",
    (
      event,
      opts?: {
        code?: string;
        markdown?: string;
        canCopy?: boolean;
        canFind?: boolean;
        turnDetails?: { turnId: string; eventId: string };
      },
    ) => {
      showEditContextMenu(BrowserWindow.fromWebContents(event.sender), opts);
    },
  );
  ipcMain.handle(
    "composer:contextMenu",
    (
      event,
      opts?: { canCut?: boolean; canCopy?: boolean; canSelectAll?: boolean },
    ) => {
      showComposerContextMenu(BrowserWindow.fromWebContents(event.sender), opts);
    },
  );
  ipcMain.handle("sessions:list", () => sessions.list());
  ipcMain.handle("sessions:create", (_e, input: CreateSessionInput) => sessions.createSession(input));
  ipcMain.handle("sessions:fork", (_e, sessionId: string, eventId?: string) => sessions.forkSession(sessionId, eventId));
  ipcMain.handle("sessions:close", (_e, sessionId: string) => sessions.closeSession(sessionId));
  ipcMain.handle("sessions:rename", (_e, sessionId: string, title: string) => {
    sessions.renameSession(sessionId, title);
  });
  ipcMain.handle("sessions:pin", (_e, sessionId: string) => {
    sessions.pinSession(sessionId);
  });
  ipcMain.handle("sessions:unpin", (_e, sessionId: string) => {
    sessions.unpinSession(sessionId);
  });
  ipcMain.handle("sessions:setActiveUnread", (_e, unread: boolean) => {
    setActiveSessionUnread(!!unread);
  });
  ipcMain.handle("sessions:setActive", (_e, tabId: ActiveTabId) =>
    sessions.setActiveTab(tabId),
  );
  ipcMain.handle("sessions:createTerminal", (_e, sessionId: string) =>
    sessions.createTerminalTab(sessionId),
  );
  ipcMain.handle("sessions:renameTab", (_e, tabId: string, title: string) => {
    sessions.renameTab(tabId, title);
  });
  ipcMain.handle("sessions:closeTab", (_e, tabId: string) => sessions.closeTab(tabId));
  ipcMain.handle("sessions:setTabsExpanded", (_e, sessionId: string, expanded: boolean) => {
    sessions.setTabsExpanded(sessionId, expanded);
  });
  ipcMain.handle("sessions:reorderTab", (_e, sessionId: string, tabId: string, toIndex: number) => {
    sessions.reorderTab(sessionId, tabId, toIndex);
  });
  ipcMain.handle("sessions:moveTab", (_e, tabId: string, toSessionId: string, toIndex: number) => {
    sessions.moveTab(tabId, toSessionId, toIndex);
  });
  ipcMain.handle("terminal:attach", (_e, tabId: string) => {
    sessions.attachTerminal(tabId);
  });
  ipcMain.handle("terminal:write", (_e, tabId: string, data: string) => {
    sessions.writeTerminal(tabId, data);
  });
  ipcMain.handle("terminal:resize", (_e, tabId: string, cols: number, rows: number) => {
    sessions.resizeTerminal(tabId, cols, rows);
  });
  ipcMain.handle("sessions:navigateEvent", (_e, sessionId: string, turnId: string, eventId: string) =>
    sessions.navigateToEvent(sessionId, turnId, eventId),
  );
  ipcMain.handle("sessions:findInSessions", (_e, query: string, searchId: number) =>
    sessions.startFindInSessions(query, searchId),
  );
  ipcMain.handle("sessions:stopFindInSessions", () => {
    sessions.stopFindInSessions();
  });
  ipcMain.handle("session:prompt", (_e, sessionId: string, text: string) =>
    sessions.sendPrompt(sessionId, text),
  );
  ipcMain.handle("session:cancel", (_e, sessionId: string) => sessions.cancelPrompt(sessionId));
  ipcMain.handle(
    "session:permission",
    (_e, requestId: string, optionId: string | "cancelled") => {
      sessions.respondPermission(requestId, optionId);
    },
  );
  ipcMain.handle("session:askQuestion", (_e, requestId: string, outcome: unknown) => {
    sessions.respondAskQuestion(requestId, outcome);
  });
  ipcMain.handle("fs:pickFolder", async (_e, startPath?: string) => {
    const defaultPath = await resolveFolderPickerStart(startPath);
    const result = await dialog.showOpenDialog(getMainWindow()!, {
      properties: ["openDirectory", "createDirectory"],
      ...(defaultPath ? { defaultPath } : {}),
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });
  ipcMain.handle("fs:openTranscriptsFolder", () => openTranscriptsFolder());
  ipcMain.handle("fs:openSettingsFile", () => openSettingsFile());
  ipcMain.handle("settings:get", () => sessions.getSettings());
  ipcMain.handle("settings:update", (_e, patch: Partial<AppSettings>) =>
    sessions.updateSettings(patch),
  );
  ipcMain.handle("images:savePaste", async (_e, sessionId: string, mimeType: string, bytes: Uint8Array) => {
    requireSession(sessionId);
    return savePastedImage(bytes, mimeType);
  });
  ipcMain.handle("images:saveClipboard", async (_e, sessionId: string) => {
    requireSession(sessionId);
    const png = await readClipboardPng();
    if (!png) return null;
    return savePastedImage(png, "image/png");
  });
  ipcMain.handle("transcript:get", (_e, sessionId: string) => sessions.getTranscript(sessionId));

  function requireSession(sessionId: string) {
    const session = sessions.getSession(sessionId);
    if (!session) throw new Error("This agent session no longer exists.");
    return session;
  }
}
