import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import { applyAppIcon } from "./main/lifecycle/applyAppIcon";
import { installAboutPanel } from "./main/lifecycle/installAboutPanel";
import { installExternalLinks } from "./main/lifecycle/installExternalLinks";
import { installNavigationGuard } from "./main/lifecycle/installNavigationGuard";
import { installPermissionGuard } from "./main/lifecycle/installPermissionGuard";
import { installImageProtocol } from "./main/images/installImageProtocol";
import { SessionManager } from "./main/sessions/SessionManager";
import { installQuitHandler } from "./main/lifecycle/installQuitHandler";
import { confirmQuit } from "./main/lifecycle/confirmQuit";
import { installSingleInstanceLock } from "./main/lifecycle/installSingleInstanceLock";
import { installStdioGuards } from "./main/lifecycle/installStdioGuards";
import { ControlServer } from "./main/control/ControlServer";
import { CronScheduler } from "./main/crons/CronScheduler";
import { runCron } from "./main/crons/runCron";
import { ReminderScheduler } from "./main/reminders/ReminderScheduler";
import { fireReminder } from "./main/reminders/fireReminder";
import { registerIpc } from "./main/registerIpc";
import { registerFileIpc } from "./main/files/registerFileIpc";
import type { SessionFileWatcher } from "./main/files/SessionFileWatcher";
import { buildAppMenu } from "./main/appMenu/buildAppMenu";
import { refreshSessionMenuItems } from "./main/appMenu/refreshSessionMenuItems";
import { refreshVoiceMenuItems } from "./main/appMenu/refreshVoiceMenuItems";
import type { AppMenuOptions } from "./main/appMenu/AppMenuOptions";
import { VoiceAgent } from "./main/voice/VoiceAgent";
import { registerVoiceIpc } from "./main/voice/registerVoiceIpc";
import { openVoiceLogFolder } from "./main/files/openVoiceLogFolder";
import { shellEnv } from "./main/shellEnv/shellEnv";
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
const control = new ControlServer(sessions);
let mainWindow: BrowserWindow | null = null;
const crons = new CronScheduler((job, at) => {
  if (!mainWindow) return;
  void runCron(sessions, job, at).catch((error) => {
    console.warn(`[crons] "${job.cron}" in ${job.cwd} failed:`, errorMessage(error));
  });
});
let activeSessionUnread = false;
let fileWatcher: SessionFileWatcher | null = null;
const voice = new VoiceAgent({
  sessions,
  getWindow: () => mainWindow,
  onStatus: refreshVoiceMenuItems,
});
sessions.setObserver(voice.observer);
const reminders = new ReminderScheduler((reminder) =>
  fireReminder(reminder, { sessions, voice, getWindow: () => mainWindow }),
);

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
      // Voice keeps talking and hearing while the window is hidden.
      backgroundThrottling: false,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  installExternalLinks(mainWindow.webContents);
  installNavigationGuard(mainWindow.webContents);
  installPermissionGuard(mainWindow.webContents.session);
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
  // Agents start from the user's shell environment; read it while the window loads.
  void shellEnv.get();
  app.on("ready", () => {
    applyAppIcon();
    installAboutPanel();
    registerIpc({
      sessions,
      control,
      getMainWindow: () => mainWindow,
      setActiveSessionUnread: (unread) => {
        activeSessionUnread = unread;
        refreshMenus();
      },
    });
    registerVoiceIpc(voice);
    fileWatcher = registerFileIpc(sessions);
    sessions.setOnSessionsChanged(() => {
      refreshMenus();
    });
    const menuOptions: AppMenuOptions = {
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
      voice: {
        getStatus: () => voice.getStatus(),
        toggle: () => void voice.toggle(),
        openSettings: () => mainWindow?.webContents.send("settings:open"),
        openLog: () => void openVoiceLogFolder().catch(console.error),
      },
    };
    buildAppMenu(menuOptions);
    void createWindow().then(() => {
      crons.start();
      reminders.start();
      void control.apply(sessions.getSettings());
    });
  });

  app.on("window-all-closed", () => app.quit());

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });

  installQuitHandler(
    () => confirmQuit(mainWindow, sessions.runningChatCount()),
    async () => {
      voice.stop();
      fileWatcher?.dispose();
      crons.stop();
      reminders.stop();
      await sessions.disposeAll();
      await control.stop();
    },
  );
}
