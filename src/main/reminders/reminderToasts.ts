import { BrowserWindow, screen, type Rectangle } from "electron";
import type { Theme } from "../../shared/appSettings";
import type { ReminderAlert } from "./ReminderAlert";
import { reminderToastHtml } from "./reminderToastHtml";

const WIDTH = 360;
const HEIGHT = 100;
const MARGIN = 16;
const GAP = 10;

/** Open toasts, oldest first, with the work area of the display each opened on. */
const open: Array<{ win: BrowserWindow; area: Rectangle }> = [];

/** Stack toasts down from the top-right corner of their display. */
function layout(): void {
  open.forEach(({ win, area }, index) => {
    win.setPosition(area.x + area.width - WIDTH - MARGIN, area.y + MARGIN + index * (HEIGHT + GAP));
  });
}

/**
 * Small always-on-top popups for reminders the OS won't show as notifications. They never take focus
 * and stay until clicked (opens the reminder) or dismissed.
 */
export const reminderToasts = {
  show(alert: ReminderAlert, theme: Theme): void {
    const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
    const win = new BrowserWindow({
      width: WIDTH,
      height: HEIGHT,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      // Never steals focus from what the user is typing in, yet still takes the click.
      focusable: false,
      acceptFirstMouse: true,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    win.setVisibleOnAllWorkspaces(true);
    const { webContents } = win;
    webContents.on("page-title-updated", (event, title) => {
      event.preventDefault();
      if (title === "open") alert.onClick();
      if (title === "open" || title === "dismiss") win.close();
    });
    webContents.on("will-navigate", (event) => event.preventDefault());
    webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.once("ready-to-show", () => win.showInactive());
    win.on("closed", () => {
      open.splice(open.findIndex((toast) => toast.win === win), 1);
      layout();
    });
    open.push({ win, area });
    layout();
    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(reminderToastHtml(alert, theme))}`);
  },
};
