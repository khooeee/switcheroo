import { app } from "electron";
import { appIconPath } from "./appIconPath";

/** Fill the about panel; Linux has no defaults and shows only what is set here. */
export function installAboutPanel(): void {
  app.setAboutPanelOptions({
    applicationName: app.name,
    applicationVersion: app.getVersion(),
    copyright: "Copyright © 2026 Chris Khoo",
    website: "https://github.com/khooeee/switcheroo",
    iconPath: appIconPath() ?? undefined,
  });
}
