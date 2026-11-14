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
      id: SESSION_MENU_IDS.rename,
      label: "Rename",
      enabled: state.chatItemsEnabled,
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
      enabled: state.chatItemsEnabled,
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
      click: () => {
        win()?.webContents.send("session:stop");
      },
    },
    {
      id: SESSION_MENU_IDS.close,
      label: "Close",
      enabled: state.chatItemsEnabled,
      accelerator: "CmdOrCtrl+W",
      click: () => {
        win()?.webContents.send("session:close");
      },
    },
  ];
}
