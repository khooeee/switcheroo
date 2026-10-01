import { Menu, app, type BrowserWindow } from "electron";
import type { SessionPinMenuState } from "./sessionPinMenuState";

const PIN_MENU_ID = "session-toggle-pin";

/** Build the application menu; pin item label/enabled come from `getPinMenuState`. */
export function buildAppMenu(opts: {
  getMainWindow: () => BrowserWindow | null;
  getPinMenuState: () => SessionPinMenuState;
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

export function refreshSessionPinMenu(state: SessionPinMenuState): void {
  const item = Menu.getApplicationMenu()?.getMenuItemById(PIN_MENU_ID);
  if (!item) return;
  item.label = state.label;
  item.enabled = state.enabled;
}
