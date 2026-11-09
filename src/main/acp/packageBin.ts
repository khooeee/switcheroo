import { app } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Absolute path to a pinned adapter bin (never go through npx). Packaged builds only look inside
 * the app: a `node_modules` in the launch directory must never stand in for the bundled adapter.
 */
export function packageBin(packageName: string): string {
  const root = app.isPackaged ? join(process.resourcesPath, "app.asar.unpacked") : process.cwd();
  const entry = join(root, "node_modules", ...packageName.split("/"), "dist", "index.js");
  if (existsSync(entry)) return entry;
  throw new Error(`ACP adapter not installed: ${packageName}`);
}
