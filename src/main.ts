import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import { applyAppIcon } from "./main/lifecycle/applyAppIcon";
import { installExternalLinks } from "./main/lifecycle/installExternalLinks";
import { installImageProtocol } from "./main/images/installImageProtocol";
import { SessionManager } from "./main/sessions/SessionManager";
import { installQuitHandler } from "./main/lifecycle/installQuitHandler";
import { confirmQuit } from "./main/lifecycle/confirmQuit";
import { installSingleInstanceLock } from "./main/lifecycle/installSingleInstanceLock";
import { installStdioGuards } from "./main/lifecycle/installStdioGuards";
import { ControlServer } from "./main/control/ControlServer";
import { CronScheduler } from "./main/crons/CronScheduler";
import { runCron } from "./main/crons/runCron";
import { registerIpc } from "./main/registerIpc";
import { buildAppMenu } from "./main/appMenu/buildAppMenu";
import { refreshSessionMenuItems } from "./main/appMenu/refreshSessionMenuItems";
import { errorMessage } from "./shared/errorMessage";

installStdioGuards((error) => {
  if (app.isReady()) {
    dialog.showErrorBox(
      "A JavaScript error occurred in the main process",
      error.stack ?? String(error),
    );
  }
});

app.setName("Switcheroo");
installImageProtocol();

const sessions = new SessionManager();
const control = new ControlServer();
let mainWindow: BrowserWindow | null = null;
const crons = new CronScheduler((job, at) => {
  if (!mainWindow) return;
  void runCron(sessions, job, at).catch((error) => {
    console.warn(`[crons] "${job.cron}" in ${job.cwd} failed:`, errorMessage(error));
  });
});
let activeSessionUnread = false;

function refreshMenus() {
  refreshSessionMenuItems(sessions.activeMenuState(), activeSessionUnread);
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
      getMenuState: () => sessions.activeMenuState(),
      openActiveInCursor: () => {
        void sessions.openActiveInCursor().catch((error) => {
          dialog.showErrorBox(
            "Could not open in Cursor",
            errorMessage(error),
          );
        });
      },
      getActiveUnread: () => activeSessionUnread,
    });
    void createWindow().then(() => crons.start());
    void control.start(sessions);
  });

  app.on("window-all-closed", () => app.quit());

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });

  installQuitHandler(
    () => confirmQuit(mainWindow, sessions.quitBusyCounts()),
    async () => {
      crons.stop();
      await sessions.disposeAll();
      await control.stop();
    },
  );
}
