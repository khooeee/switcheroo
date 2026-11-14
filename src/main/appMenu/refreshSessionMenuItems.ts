import { Menu } from "electron";
import { SESSION_MENU_IDS } from "./sessionMenuIds";

/** Enable or disable the Sessions-mode menu items in place without rebuilding the menu. */
export function refreshSessionMenuItems(sessionsMode: boolean): void {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;
  for (const id of Object.values(SESSION_MENU_IDS)) {
    const item = menu.getMenuItemById(id);
    if (item) item.enabled = sessionsMode;
  }
}
