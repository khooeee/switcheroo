import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

/** Absolute path to the PNG app icon (dev checkout or packaged extraResource). */
export function appIconPath(): string | null {
  const candidates = [
    app.isPackaged ? path.join(process.resourcesPath, "icon.png") : null,
    path.join(app.getAppPath(), "assets", "icon.png"),
    // electron-forge vite builds main into `.vite/build`
    path.join(__dirname, "..", "..", "assets", "icon.png"),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}
