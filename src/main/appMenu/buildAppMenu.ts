import { Menu, app } from "electron";
import type { AppMenuOptions } from "./AppMenuOptions";
import { SESSION_MENU_IDS } from "./sessionMenuIds";

/** Build the application menu; session item state comes from getters. */
export function buildAppMenu(opts: AppMenuOptions): void {
  const win = () => opts.getMainWindow();
  const isMac = process.platform === "darwin";
  const sessionsMode = opts.getSessionsMode();
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
          id: "toggle-file-explorer",
          enabled: opts.getHasSessions(),
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
      label: "Window",
      // No close role: it binds Cmd/Ctrl+W, which closes the active session in the renderer.
      submenu: [{ role: "minimize" }],
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
