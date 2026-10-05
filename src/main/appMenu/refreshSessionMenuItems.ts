import { Menu } from "electron";
import type { SessionPinMenuState } from "../menuState/sessionPinMenuState";
import { SESSION_MENU_IDS } from "./sessionMenuIds";

/** Update Session menu labels/enabled state in place without rebuilding the menu. */
export function refreshSessionMenuItems(
  pin: SessionPinMenuState,
  renameEnabled: boolean,
  openInCursorEnabled: boolean,
  unreadEnabled: boolean,
  forkEnabled: boolean,
  stopEnabled: boolean,
  newTerminalEnabled: boolean,
  activeUnread: boolean,
): void {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;
  const pinItem = menu.getMenuItemById(SESSION_MENU_IDS.pin);
  if (pinItem) {
    pinItem.label = pin.label;
    pinItem.enabled = pin.enabled;
  }
  const renameItem = menu.getMenuItemById(SESSION_MENU_IDS.rename);
  if (renameItem) renameItem.enabled = renameEnabled;
  const openInCursorItem = menu.getMenuItemById(SESSION_MENU_IDS.openInCursor);
  if (openInCursorItem) openInCursorItem.enabled = openInCursorEnabled;
  const forkItem = menu.getMenuItemById(SESSION_MENU_IDS.fork);
  if (forkItem) forkItem.enabled = forkEnabled;
  const markUnreadItem = menu.getMenuItemById(SESSION_MENU_IDS.markUnread);
  if (markUnreadItem) {
    markUnreadItem.label = activeUnread ? "Mark as Read" : "Mark as Unread";
    markUnreadItem.enabled = unreadEnabled;
  }
  const stopItem = menu.getMenuItemById(SESSION_MENU_IDS.stop);
  if (stopItem) stopItem.enabled = stopEnabled;
  const closeItem = menu.getMenuItemById(SESSION_MENU_IDS.close);
  if (closeItem) closeItem.enabled = renameEnabled;
  const newTerminalItem = menu.getMenuItemById(SESSION_MENU_IDS.newTerminal);
  if (newTerminalItem) newTerminalItem.enabled = newTerminalEnabled;
}
