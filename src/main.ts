import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { applyAppIcon } from "./main/applyAppIcon";
import { installExternalLinks } from "./main/installExternalLinks";
import { SessionManager } from "./main/sessions";
import { installQuitHandler } from "./main/installQuitHandler";
import { installSingleInstanceLock } from "./main/installSingleInstanceLock";
import { installStdioGuards } from "./main/installStdioGuards";
import { openInCursor } from "./main/openInCursor";
import { openTranscriptsFolder } from "./main/openTranscriptsFolder";
import { openSettingsFile } from "./main/openSettingsFile";
import { readClipboardPng } from "./main/readClipboardPng";
import { savePastedImage } from "./main/savePastedImage";
import { ControlServer } from "./main/control/ControlServer";
import { availableAgents } from "./main/acp/availableAgents";
import { buildAppMenu, refreshSessionMenuItems } from "./main/buildAppMenu";
import { showEditContextMenu } from "./main/showEditContextMenu";
import type { ActiveSessionId, AppSettings, CreateSessionInput } from "./shared/types";

installStdioGuards((error) => {
  if (app.isReady()) {
    dialog.showErrorBox(
      "A JavaScript error occurred in the main process",
      error.stack ?? String(error),
    );
  }
});

if (started) {
  app.quit();
}

app.setName("Switcheroo");

const sessions = new SessionManager();
const control = new ControlServer();
let mainWindow: BrowserWindow | null = null;
let activeSessionUnread = false;

function refreshMenus() {
  refreshSessionMenuItems(
    sessions.activePinMenuState(),
    sessions.activeRenameMenuEnabled(),
    sessions.activeForkMenuEnabled(),
    sessions.activeStopMenuEnabled(),
    activeSessionUnread,
  );
}

const createWindow = async () => {
  await sessions.init();
  refreshMenus();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Switcheroo",
    backgroundColor: "#0e1114",
    icon: applyAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      autoplayPolicy: "no-user-gesture-required",
      nodeIntegration: false,
      sandbox: false,
    },
  });

  installExternalLinks(mainWindow.webContents);
  sessions.setWindow(mainWindow);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

function registerIpc(): void {
  ipcMain.handle("files:openInCursor", async (_event, sessionId: string, filePath: string) => {
    await openInCursor(requireSession(sessionId).cwd, filePath);
  });
  ipcMain.handle("agents:available", () => availableAgents());
  ipcMain.handle("edit:contextMenu", (event, markdown?: string) => {
    showEditContextMenu(BrowserWindow.fromWebContents(event.sender), markdown);
  });
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
    activeSessionUnread = !!unread;
    refreshMenus();
  });
  ipcMain.handle("sessions:setActive", (_e, sessionId: ActiveSessionId) =>
    sessions.setActiveSession(sessionId),
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
  ipcMain.handle("fs:pickFolder", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openDirectory", "createDirectory"],
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
    const png = readClipboardPng();
    if (!png) return null;
    return savePastedImage(png, "image/png");
  });
  ipcMain.handle("transcript:get", (_e, sessionId: string) => sessions.getTranscript(sessionId));
}

function requireSession(sessionId: string) {
  const session = sessions.getSession(sessionId);
  if (!session) throw new Error("This agent session no longer exists.");
  return session;
}

if (installSingleInstanceLock(() => mainWindow)) {
  app.on("ready", () => {
    applyAppIcon();
    registerIpc();
    sessions.setOnSessionsChanged(() => {
      refreshMenus();
    });
    buildAppMenu({
      getMainWindow: () => mainWindow,
      getPinMenuState: () => sessions.activePinMenuState(),
      getRenameEnabled: () => sessions.activeRenameMenuEnabled(),
      getForkEnabled: () => sessions.activeForkMenuEnabled(),
      getStopEnabled: () => sessions.activeStopMenuEnabled(),
      getActiveUnread: () => activeSessionUnread,
    });
    void createWindow();
    void control.start(sessions);
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });

  installQuitHandler(async () => {
    await sessions.disposeAll();
    await control.stop();
  });
}
