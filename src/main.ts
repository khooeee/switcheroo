import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { installExternalLinks } from "./main/installExternalLinks";
import { TabManager } from "./main/tabs";
import { installQuitHandler } from "./main/installQuitHandler";
import { openInCursor } from "./main/openInCursor";
import { readClipboardPng } from "./main/readClipboardPng";
import { savePastedImage } from "./main/savePastedImage";
import type { ActiveTabId, CreateTabInput } from "./shared/types";

if (started) {
  app.quit();
}

const tabs = new TabManager();
let mainWindow: BrowserWindow | null = null;

const createWindow = async () => {
  await tabs.init();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Switcheroo",
    backgroundColor: "#0e1114",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      autoplayPolicy: "no-user-gesture-required",
      nodeIntegration: false,
      sandbox: false,
    },
  });

  installExternalLinks(mainWindow.webContents);
  tabs.setWindow(mainWindow);

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
  ipcMain.handle("files:openInCursor", async (_event, tabId: string, filePath: string) => {
    await openInCursor(requireTab(tabId).cwd, filePath);
  });
  ipcMain.handle("tabs:list", () => tabs.list());
  ipcMain.handle("tabs:create", (_e, input: CreateTabInput) => tabs.createTab(input));
  ipcMain.handle("tabs:close", (_e, tabId: string) => tabs.closeTab(tabId));
  ipcMain.handle("tabs:delete", (_e, tabId: string) => tabs.deleteTab(tabId));
  ipcMain.handle("tabs:rename", (_e, tabId: string, title: string) => {
    tabs.renameTab(tabId, title);
  });
  ipcMain.handle("tabs:setNotes", (_e, tabId: string, notes: string) => {
    tabs.setTabNotes(tabId, notes);
  });
  ipcMain.handle("tabs:setNotesWidth", (_e, tabId: string, width: number) => {
    tabs.setTabNotesWidth(tabId, width);
  });
  ipcMain.handle("tabs:reorder", (_e, tabIds: string[]) => {
    tabs.reorderTabs(tabIds);
  });
  ipcMain.handle("tabs:setActive", (_e, tabId: ActiveTabId) => {
    tabs.setActiveTab(tabId);
  });
  ipcMain.handle("tabs:navigateEvent", (_e, tabId: string, eventId: string) => {
    tabs.navigateToEvent(tabId, eventId);
  });
  ipcMain.handle("session:prompt", (_e, tabId: string, text: string) =>
    tabs.sendPrompt(tabId, text),
  );
  ipcMain.handle("session:cancel", (_e, tabId: string) => tabs.cancelPrompt(tabId));
  ipcMain.handle(
    "session:permission",
    (_e, requestId: string, optionId: string | "cancelled") => {
      tabs.respondPermission(requestId, optionId);
    },
  );
  ipcMain.handle("session:askQuestion", (_e, requestId: string, outcome: unknown) => {
    tabs.respondAskQuestion(requestId, outcome);
  });
  ipcMain.handle("fs:pickFolder", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openDirectory", "createDirectory"],
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });
  ipcMain.handle("images:savePaste", async (_e, tabId: string, mimeType: string, bytes: Uint8Array) => {
    requireTab(tabId);
    return savePastedImage(bytes, mimeType);
  });
  ipcMain.handle("images:saveClipboard", async (_e, tabId: string) => {
    requireTab(tabId);
    const png = readClipboardPng();
    if (!png) return null;
    return savePastedImage(png, "image/png");
  });
  ipcMain.handle("transcript:get", (_e, tabId: string) => tabs.getTranscript(tabId));
}

function requireTab(tabId: string) {
  const tab = tabs.list().tabs.find((item) => item.id === tabId);
  if (!tab) throw new Error("This agent tab no longer exists.");
  return tab;
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
        {
          label: "Focus Prompt",
          accelerator: "CmdOrCtrl+I",
          click: () => {
            mainWindow?.webContents.send("prompt:focus");
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
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
    {
      role: "help",
      submenu: [
        {
          label: "Agent Client Protocol",
          click: () => {
            void shell.openExternal("https://agentclientprotocol.com/");
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on("ready", () => {
  registerIpc();
  buildMenu();
  void createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});

installQuitHandler(() => tabs.disposeAll());
