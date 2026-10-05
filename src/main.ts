import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { applyAppIcon } from "./main/applyAppIcon";
import { installExternalLinks } from "./main/installExternalLinks";
import { SessionManager } from "./main/sessions/SessionManager";
import { installQuitHandler } from "./main/installQuitHandler";
import { installSingleInstanceLock } from "./main/installSingleInstanceLock";
import { installStdioGuards } from "./main/installStdioGuards";
import { ControlServer } from "./main/control/ControlServer";
import { registerIpc } from "./main/registerIpc";
import { buildAppMenu } from "./main/appMenu/buildAppMenu";
import { refreshSessionMenuItems } from "./main/appMenu/refreshSessionMenuItems";

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
    sessions.activeOpenInCursorEnabled(),
    sessions.activeUnreadMenuEnabled(),
    sessions.activeForkMenuEnabled(),
    sessions.activeStopMenuEnabled(),
    sessions.activeNewTerminalMenuEnabled(),
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

if (installSingleInstanceLock(() => mainWindow)) {
  app.on("ready", () => {
    applyAppIcon();
    registerIpc({
      sessions,
      getMainWindow: () => mainWindow,
      setActiveSessionUnread: (unread) => {
        activeSessionUnread = unread;
        refreshMenus();
      },
    });
    sessions.setOnSessionsChanged(() => {
      refreshMenus();
    });
    buildAppMenu({
      getMainWindow: () => mainWindow,
      getPinMenuState: () => sessions.activePinMenuState(),
      getRenameEnabled: () => sessions.activeRenameMenuEnabled(),
      getOpenInCursorEnabled: () => sessions.activeOpenInCursorEnabled(),
      openActiveInCursor: () => {
        void sessions.openActiveInCursor().catch((error) => {
          dialog.showErrorBox(
            "Could not open in Cursor",
            error instanceof Error ? error.message : String(error),
          );
        });
      },
      getUnreadEnabled: () => sessions.activeUnreadMenuEnabled(),
      getForkEnabled: () => sessions.activeForkMenuEnabled(),
      getStopEnabled: () => sessions.activeStopMenuEnabled(),
      getNewTerminalEnabled: () => sessions.activeNewTerminalMenuEnabled(),
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
