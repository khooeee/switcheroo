import { existsSync } from "node:fs";
import { join } from "node:path";

/** Absolute path to a pinned adapter bin (never go through npx). */
export function packageBin(packageName: string): string {
  const parts = packageName.split("/");
  const roots = [process.cwd()];
  if (typeof process.resourcesPath === "string") {
    roots.push(join(process.resourcesPath, "app.asar.unpacked"));
  }
  for (const root of roots) {
    const entry = join(root, "node_modules", ...parts, "dist", "index.js");
    if (existsSync(entry)) return entry;
  }
  throw new Error(`ACP adapter not installed: ${packageName}`);
}
