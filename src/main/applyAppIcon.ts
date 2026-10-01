import { app, nativeImage } from "electron";
import { appIconPath } from "./appIconPath";

/** Apply the custom icon for dock / Cmd+Tab (dev) and window chrome. */
export function applyAppIcon(): ReturnType<typeof nativeImage.createFromPath> | undefined {
  const iconFile = appIconPath();
  if (!iconFile) return undefined;

  const icon = nativeImage.createFromPath(iconFile);
  if (icon.isEmpty()) return undefined;

  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(icon);
  }
  return icon;
}
