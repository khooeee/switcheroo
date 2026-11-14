import { Menu } from "electron";
import { SESSION_MENU_IDS } from "./sessionMenuIds";

/** Refresh mode command availability in place without rebuilding the menu. */
export function refreshSessionMenuItems(sessionsMode: boolean, hasSessions: boolean): void {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;
  const explorer = menu.getMenuItemById("toggle-file-explorer");
  if (explorer) explorer.enabled = hasSessions;
  for (const id of Object.values(SESSION_MENU_IDS)) {
    const item = menu.getMenuItemById(id);
    if (item) item.enabled = sessionsMode;
  }
}
