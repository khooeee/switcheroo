import { BrowserWindow, dialog, ipcMain } from "electron";
import { openTranscriptsFolder } from "./files/openTranscriptsFolder";
import { openCronsFile } from "./files/openCronsFile";
import { listReminders } from "./reminders/listReminders";
import { saveReminder } from "./reminders/saveReminder";
import { cancelReminder } from "./reminders/cancelReminder";
import type { ReminderInput } from "../shared/reminderInput";
import { readClipboardPng } from "./images/readClipboardPng";
import { savePastedImage } from "./images/savePastedImage";
import { availableAgents } from "./acp/availableAgents";
import { showEditContextMenu } from "./contextMenus/showEditContextMenu";
import { showComposerContextMenu } from "./contextMenus/showComposerContextMenu";
import { showImageContextMenu } from "./contextMenus/showImageContextMenu";
import { resolveFolderPickerStart } from "./files/resolveFolderPickerStart";
import { saveMarkdownFile } from "./files/saveMarkdownFile";
import type { SessionManager } from "./sessions/SessionManager";
import type { ControlServer } from "./control/ControlServer";
import type { AppSettings } from "../shared/appSettings";
import type { ConfigMenuCategory } from "../shared/configMenuCategory";
import type { CreateSessionInput } from "../shared/createSessionInput";
import type { EditContextMenuOptions } from "../shared/editContextMenuOptions";

type IpcContext = {
  sessions: SessionManager;
  control: ControlServer;
  getMainWindow: () => BrowserWindow | null;
  refreshMenus: () => void;
};

/** Register every renderer → main `ipcMain.handle` channel. */
export function registerIpc({
  sessions,
  control,
  getMainWindow,
  refreshMenus,
}: IpcContext): void {
  ipcMain.handle("agents:available", () => availableAgents());
  ipcMain.handle("edit:contextMenu", (event, opts?: EditContextMenuOptions) => {
    showEditContextMenu(BrowserWindow.fromWebContents(event.sender), opts);
  });
  ipcMain.handle("image:contextMenu", (event, name: string) => {
    showImageContextMenu(BrowserWindow.fromWebContents(event.sender), name);
  });
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
  ipcMain.handle("sessions:setActive", (_e, tabId: string) =>
    sessions.setActiveTab(tabId),
  );
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
  ipcMain.handle("session:configMenu", (event, sessionId: string, category: ConfigMenuCategory) =>
    sessions.showConfigMenu(BrowserWindow.fromWebContents(event.sender), sessionId, category),
  );
  ipcMain.handle("session:cancel", (_e, sessionId: string) => sessions.cancelPrompt(sessionId));
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
  ipcMain.handle("fs:saveMarkdown", (event, text: string, nameHint?: string) =>
    saveMarkdownFile(BrowserWindow.fromWebContents(event.sender), text, nameHint),
  );
  ipcMain.handle("fs:openTranscriptsFolder", () => openTranscriptsFolder());
  ipcMain.handle("fs:openCronsFile", () => openCronsFile());
  ipcMain.handle("reminders:list", () => listReminders());
  ipcMain.handle("reminders:save", (_e, input: ReminderInput) => saveReminder(input));
  ipcMain.handle("reminders:cancel", (_e, id: string) => cancelReminder(id));
  ipcMain.handle("settings:get", () => sessions.getSettings());
  ipcMain.handle("settings:update", async (_e, patch: Partial<AppSettings>) => {
    const next = sessions.updateSettings(patch);
    // Find in History is disabled in File Explorer mode.
    if (patch.railMode !== undefined) refreshMenus();
    await control.apply(next);
    return next;
  });
  ipcMain.handle("remote:status", () => control.status());
  ipcMain.handle("control:rotateToken", async () => {
    await control.rotateToken();
    return control.status();
  });
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
  ipcMain.handle("subagent:transcript", (_e, sessionId: string, subagentId: string) =>
    sessions.getSubagentTranscript(sessionId, subagentId));

  function requireSession(sessionId: string) {
    const session = sessions.getSession(sessionId);
    if (!session) throw new Error("This agent session no longer exists.");
    return session;
  }
}
