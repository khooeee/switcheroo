import { Menu, app } from "electron";
import type { AppMenuOptions } from "./AppMenuOptions";
import { sessionSubmenu } from "./sessionSubmenu";

/** Build the application menu; session item state comes from getters. */
export function buildAppMenu(opts: AppMenuOptions): void {
  const win = () => opts.getMainWindow();
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
      submenu: sessionSubmenu(opts),
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
        {
          label: "Paste Switcheroo Aware Prompt",
          click: () => {
            win()?.webContents.send("prompt:paste-aware");
          },
        },
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
          label: "Go to Next Tab",
          accelerator: "Ctrl+Tab",
          click: () => {
            win()?.webContents.send("session:next");
          },
        },
        {
          label: "Go to Previous Tab",
          accelerator: "Ctrl+Shift+Tab",
          click: () => {
            win()?.webContents.send("session:prev");
          },
        },
        {
          label: "Go Back",
          accelerator: isMac ? "Cmd+[" : "Alt+Left",
          click: () => {
            win()?.webContents.send("session:back");
          },
        },
        {
          label: "Go Forward",
          accelerator: isMac ? "Cmd+]" : "Alt+Right",
          click: () => {
            win()?.webContents.send("session:forward");
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
        {
          label: "Go to Filter Tabs",
          accelerator: "CmdOrCtrl+G",
          click: () => {
            win()?.webContents.send("filter:focus");
          },
        },
      ],
    },
    {
      label: "Window",
      // The close role binds Ctrl+W on Linux, which belongs to Session → Close.
      submenu: [{ role: "minimize" }, ...(isMac ? [{ role: "close" as const }] : [])],
    },
    ...(isMac
      ? []
      : [
          {
            label: "Help",
            submenu: [{ label: `About ${app.name}`, click: () => app.showAboutPanel() }],
          },
        ]),
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
