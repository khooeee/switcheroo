import { Menu, app, type BrowserWindow } from "electron";
import type { SessionPinMenuState } from "./sessionPinMenuState";

const PIN_MENU_ID = "session-toggle-pin";
const RENAME_MENU_ID = "session-rename";
const FORK_MENU_ID = "session-fork";
const STOP_MENU_ID = "session-stop";
const CLOSE_MENU_ID = "session-close";

/** Build the application menu; session item state comes from getters. */
export function buildAppMenu(opts: {
  getMainWindow: () => BrowserWindow | null;
  getPinMenuState: () => SessionPinMenuState;
  getRenameEnabled: () => boolean;
  getForkEnabled: () => boolean;
  getStopEnabled: () => boolean;
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
          label: "New",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            win()?.webContents.send("session:new");
          },
        },
        {
          id: RENAME_MENU_ID,
          label: "Rename",
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
        {
          id: FORK_MENU_ID,
          label: "Fork",
          enabled: opts.getForkEnabled(),
          accelerator: "CmdOrCtrl+Y",
          click: () => {
            win()?.webContents.send("session:fork");
          },
        },
        { type: "separator" },
        {
          id: STOP_MENU_ID,
          label: "Stop",
          enabled: opts.getStopEnabled(),
          // Display-only: registering Ctrl+C steals Edit→Copy and can drop this item on macOS.
          accelerator: "Ctrl+C",
          registerAccelerator: false,
          click: () => {
            win()?.webContents.send("session:stop");
          },
        },
        {
          id: CLOSE_MENU_ID,
          label: "Close",
          enabled: opts.getRenameEnabled(),
          accelerator: "CmdOrCtrl+W",
          click: () => {
            win()?.webContents.send("session:close");
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
  forkEnabled: boolean,
  stopEnabled: boolean,
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
  const forkItem = menu.getMenuItemById(FORK_MENU_ID);
  if (forkItem) forkItem.enabled = forkEnabled;
  const stopItem = menu.getMenuItemById(STOP_MENU_ID);
  if (stopItem) stopItem.enabled = stopEnabled;
  const closeItem = menu.getMenuItemById(CLOSE_MENU_ID);
  if (closeItem) closeItem.enabled = renameEnabled;
}
