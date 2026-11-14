import { Menu, app } from "electron";
import type { AppMenuOptions } from "./AppMenuOptions";
import { SESSION_MENU_IDS } from "./sessionMenuIds";
import { sessionSubmenu } from "./sessionSubmenu";
import { voiceSubmenu } from "./voiceSubmenu";

/** Build the application menu; session item state comes from getters. */
export function buildAppMenu(opts: AppMenuOptions): void {
  const win = () => opts.getMainWindow();
  const isMac = process.platform === "darwin";
  const sessionsMode = opts.getMenuState().sessionsModeEnabled;
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              {
                label: "Settings…",
                accelerator: "Cmd+,",
                click: () => {
                  win()?.webContents.send("settings:open");
                },
              },
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
          id: SESSION_MENU_IDS.findInHistory,
          label: "Find in History",
          enabled: sessionsMode,
          accelerator: "CmdOrCtrl+Shift+F",
          click: () => {
            win()?.webContents.send("find-sessions:open");
          },
        },
        // macOS has Settings… in the app menu; Linux has no app menu, so it lives here.
        ...(isMac
          ? []
          : [
              { type: "separator" as const },
              {
                label: "Settings…",
                accelerator: "Ctrl+,",
                click: () => {
                  win()?.webContents.send("settings:open");
                },
              },
            ]),
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle File Explorer",
          accelerator: "CmdOrCtrl+Shift+E",
          click: () => {
            win()?.webContents.send("explorer:toggle");
          },
        },
        { type: "separator" },
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
          id: SESSION_MENU_IDS.nextTab,
          label: "Go to Next Tab",
          enabled: sessionsMode,
          accelerator: "Ctrl+Tab",
          click: () => {
            win()?.webContents.send("session:next");
          },
        },
        {
          id: SESSION_MENU_IDS.prevTab,
          label: "Go to Previous Tab",
          enabled: sessionsMode,
          accelerator: "Ctrl+Shift+Tab",
          click: () => {
            win()?.webContents.send("session:prev");
          },
        },
        {
          id: SESSION_MENU_IDS.back,
          label: "Go Back",
          enabled: sessionsMode,
          accelerator: isMac ? "Cmd+[" : "Alt+Left",
          click: () => {
            win()?.webContents.send("session:back");
          },
        },
        {
          id: SESSION_MENU_IDS.forward,
          label: "Go Forward",
          enabled: sessionsMode,
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
          label: "Go to Filter Sessions",
          accelerator: "CmdOrCtrl+P",
          click: () => {
            win()?.webContents.send("filter:focus");
          },
        },
      ],
    },
    {
      label: "Voice",
      submenu: voiceSubmenu(opts.voice),
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
