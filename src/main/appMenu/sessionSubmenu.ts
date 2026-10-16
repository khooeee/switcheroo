import type { MenuItemConstructorOptions } from "electron";
import type { AppMenuOptions } from "./AppMenuOptions";
import { SESSION_MENU_IDS } from "./sessionMenuIds";

/** Items under the Session menu; enabled/label state comes from `getMenuState`. */
export function sessionSubmenu(opts: AppMenuOptions): MenuItemConstructorOptions[] {
  const win = () => opts.getMainWindow();
  const state = opts.getMenuState();
  return [
    {
      label: "New Session",
      accelerator: "CmdOrCtrl+N",
      click: () => {
        win()?.webContents.send("session:new");
      },
    },
    {
      id: SESSION_MENU_IDS.newTerminal,
      label: "New Terminal",
      enabled: state.newTerminalEnabled,
      accelerator: "CmdOrCtrl+T",
      click: () => {
        win()?.webContents.send("session:new-terminal");
      },
    },
    {
      id: SESSION_MENU_IDS.rename,
      label: "Rename",
      enabled: state.renameEnabled,
      accelerator: "CmdOrCtrl+R",
      click: () => {
        win()?.webContents.send("session:rename");
      },
    },
    {
      id: SESSION_MENU_IDS.openInCursor,
      label: "Open in Cursor",
      enabled: state.openInCursorEnabled,
      accelerator: "CmdOrCtrl+E",
      click: () => {
        opts.openActiveInCursor();
      },
    },
    {
      id: SESSION_MENU_IDS.markUnread,
      label: opts.getActiveUnread() ? "Mark as Read" : "Mark as Unread",
      enabled: state.unreadEnabled,
      accelerator: "CmdOrCtrl+U",
      click: () => {
        win()?.webContents.send("session:mark-unread");
      },
    },
    {
      id: SESSION_MENU_IDS.fork,
      label: "Fork",
      enabled: state.forkEnabled,
      accelerator: "CmdOrCtrl+Y",
      click: () => {
        win()?.webContents.send("session:fork");
      },
    },
    {
      id: SESSION_MENU_IDS.pin,
      label: state.pin.label,
      enabled: state.pin.enabled,
      accelerator: "CmdOrCtrl+P",
      click: () => {
        win()?.webContents.send("session:toggle-pin");
      },
    },
    { type: "separator" },
    {
      id: SESSION_MENU_IDS.stop,
      label: "Stop",
      enabled: state.stopEnabled,
      // Display-only: registering Ctrl+C steals Edit→Copy and can drop this item on macOS.
      accelerator: "Ctrl+C",
      registerAccelerator: false,
      click: () => {
        win()?.webContents.send("session:stop");
      },
    },
    {
      id: SESSION_MENU_IDS.close,
      label: "Close",
      enabled: state.renameEnabled,
      accelerator: "Cmd+W",
      click: () => {
        win()?.webContents.send("session:close");
      },
    },
  ];
}
