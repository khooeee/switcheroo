import { Menu, app, type BrowserWindow } from "electron";
import type { SessionPinMenuState } from "./sessionPinMenuState";

const PIN_MENU_ID = "session-toggle-pin";
const RENAME_MENU_ID = "session-rename";

/** Build the application menu; session item state comes from getters. */
export function buildAppMenu(opts: {
  getMainWindow: () => BrowserWindow | null;
  getPinMenuState: () => SessionPinMenuState;
  getRenameEnabled: () => boolean;
}): void {
  const win = () => opts.getMainWindow();
  const pin = opts.getPinMenuState();
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
      label: "Session",
      submenu: [
        {
          label: "New Session",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            win()?.webContents.send("session:new");
          },
        },
        {
          id: RENAME_MENU_ID,
          label: "Rename Session",
          enabled: opts.getRenameEnabled(),
          accelerator: "CmdOrCtrl+R",
          click: () => {
            win()?.webContents.send("session:rename");
          },
        },
        {
          id: PIN_MENU_ID,
          label: pin.label,
          enabled: pin.enabled,
          accelerator: "CmdOrCtrl+P",
          click: () => {
            win()?.webContents.send("session:toggle-pin");
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
            win()?.webContents.send("find:open");
          },
        },
        {
          label: "Find in History",
          accelerator: "CmdOrCtrl+Shift+F",
          click: () => {
            win()?.webContents.send("find-sessions:open");
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload", accelerator: "CmdOrCtrl+Shift+R" },
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
          label: "Go to Next Session",
          accelerator: "Ctrl+Tab",
          click: () => {
            win()?.webContents.send("session:next");
          },
        },
        {
          label: "Go to Previous Session",
          accelerator: "Ctrl+Shift+Tab",
          click: () => {
            win()?.webContents.send("session:prev");
          },
        },
        { type: "separator" },
        {
          label: "Go to Prompt",
          accelerator: "CmdOrCtrl+I",
          click: () => {
            win()?.webContents.send("prompt:focus");
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

export function refreshSessionMenuItems(
  pin: SessionPinMenuState,
  renameEnabled: boolean,
): void {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;
  const pinItem = menu.getMenuItemById(PIN_MENU_ID);
  if (pinItem) {
    pinItem.label = pin.label;
    pinItem.enabled = pin.enabled;
  }
  const renameItem = menu.getMenuItemById(RENAME_MENU_ID);
  if (renameItem) renameItem.enabled = renameEnabled;
}
