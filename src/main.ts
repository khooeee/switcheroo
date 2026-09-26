import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { applyAppIcon } from "./main/applyAppIcon";
import { installExternalLinks } from "./main/installExternalLinks";
import { SessionManager } from "./main/sessions";
import { installQuitHandler } from "./main/installQuitHandler";
import { installSingleInstanceLock } from "./main/installSingleInstanceLock";
import { openInCursor } from "./main/openInCursor";
import { readClipboardPng } from "./main/readClipboardPng";
import { savePastedImage } from "./main/savePastedImage";
import { ControlServer } from "./main/control/ControlServer";
import type { ActiveSessionId, CreateSessionInput } from "./shared/types";

if (started) {
  app.quit();
}

app.setName("Switcheroo");

const sessions = new SessionManager();
const control = new ControlServer();
let mainWindow: BrowserWindow | null = null;

const createWindow = async () => {
  await sessions.init();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Switcheroo",
    backgroundColor: "#0e1114",
    icon: applyAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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
  ipcMain.handle("sessions:list", () => sessions.list());
  ipcMain.handle("sessions:create", (_e, input: CreateSessionInput) => sessions.createSession(input));
  ipcMain.handle("sessions:fork", (_e, sessionId: string, eventId?: string) => sessions.forkSession(sessionId, eventId));
  ipcMain.handle("sessions:close", (_e, sessionId: string) => sessions.closeSession(sessionId));
  ipcMain.handle("sessions:rename", (_e, sessionId: string, title: string) => {
    sessions.renameSession(sessionId, title);
  });
  ipcMain.handle("sessions:setNotes", (_e, sessionId: string, notes: string) => {
    sessions.setSessionNotes(sessionId, notes);
  });
  ipcMain.handle("sessions:setNotesWidth", (_e, sessionId: string, width: number) => {
    sessions.setSessionNotesWidth(sessionId, width);
  });
  ipcMain.handle("sessions:reorder", (_e, sessionIds: string[]) => {
    sessions.reorderSessions(sessionIds);
  });
  ipcMain.handle("sessions:setActive", (_e, sessionId: ActiveSessionId) => {
    sessions.setActiveSession(sessionId);
  });
  ipcMain.handle("sessions:navigateEvent", (_e, sessionId: string, eventId: string) => {
    sessions.navigateToEvent(sessionId, eventId);
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
  const session = sessions.list().sessions.find((item) => item.id === sessionId);
  if (!session) throw new Error("This agent session no longer exists.");
  return session;
}

function buildMenu(): void {
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Session",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow?.webContents.send("session:new");
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
        { type: "separator" },
        {
          label: "Find",
          accelerator: "CmdOrCtrl+F",
          click: () => {
            mainWindow?.webContents.send("find:open");
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Go",
      submenu: [
        {
          label: "Go to Session Tabs",
          accelerator: "CmdOrCtrl+Shift+E",
          click: () => {
            mainWindow?.webContents.send("rail:focus");
          },
        },
        {
          label: "Go to Prompt",
          accelerator: "CmdOrCtrl+I",
          click: () => {
            mainWindow?.webContents.send("prompt:focus");
          },
        },
        {
          label: "Go to Notes",
          accelerator: "CmdOrCtrl+Shift+N",
          click: () => {
            mainWindow?.webContents.send("notes:focus");
          },
        },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (installSingleInstanceLock(() => mainWindow)) {
  app.on("ready", () => {
    applyAppIcon();
    registerIpc();
    buildMenu();
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
