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
          accelerator: "Cmd+Shift+V",
          click: () => {
            win()?.webContents.send("prompt:paste-aware");
          },
        },
        { role: "selectAll" },
        { type: "separator" },
        {
          label: "Find",
          accelerator: "Cmd+F",
          click: () => {
            win()?.webContents.send("find:open");
          },
        },
        {
          label: "Find in History",
          accelerator: "Cmd+Shift+F",
          click: () => {
            win()?.webContents.send("find-sessions:open");
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload", accelerator: "Cmd+Shift+R" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom", accelerator: "Cmd+Shift+0" },
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
        { type: "separator" },
        {
          label: "Go to Prompt",
          accelerator: "Cmd+I",
          click: () => {
            win()?.webContents.send("prompt:focus");
          },
        },
        {
          label: "Go to Filter Tabs",
          accelerator: "Cmd+G",
          click: () => {
            win()?.webContents.send("filter:focus");
          },
        },
        {
          label: "Go to Switchboard",
          accelerator: "Cmd+0",
          click: () => {
            win()?.webContents.send("switchboard:open");
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
