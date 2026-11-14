import { Menu } from "electron";
import type { SessionMenuState } from "../menuState/SessionMenuState";
import { SESSION_MENU_IDS } from "./sessionMenuIds";

/** Update session menu labels/enabled state in place without rebuilding the menu. */
export function refreshSessionMenuItems(state: SessionMenuState, activeUnread: boolean): void {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;
  const set = (id: string, enabled: boolean, label?: string) => {
    const item = menu.getMenuItemById(id);
    if (!item) return;
    item.enabled = enabled;
    if (label !== undefined) item.label = label;
  };
  const sessionsModeIds = ["newSession", "findInHistory", "nextTab", "prevTab", "back", "forward"] as const;
  for (const key of sessionsModeIds) set(SESSION_MENU_IDS[key], state.sessionsModeEnabled);
  set(SESSION_MENU_IDS.pin, state.pin.enabled, state.pin.label);
  set(SESSION_MENU_IDS.rename, state.chatItemsEnabled);
  set(SESSION_MENU_IDS.fork, state.forkEnabled);
  set(SESSION_MENU_IDS.markUnread, state.chatItemsEnabled, activeUnread ? "Mark as Read" : "Mark as Unread");
  set(SESSION_MENU_IDS.stop, state.stopEnabled);
  set(SESSION_MENU_IDS.close, state.chatItemsEnabled);
}
