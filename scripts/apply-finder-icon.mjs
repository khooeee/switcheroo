import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const HASH_ATTRIBUTE = "com.switcheroo.finderIconHash";
const SET_ICON = `
ObjC.import('AppKit');
function run(argv) {
  const image = $.NSImage.alloc.initWithContentsOfFile(argv[0]);
  if (image.isNil()) throw new Error('Could not load Finder icon');
  if (!$.NSWorkspace.sharedWorkspace.setIconForFileOptions(image, argv[1], 0)) {
    throw new Error('Could not set Finder icon');
  }
}
`;

/**
 * Set a custom Finder icon so macOS displays our artwork without adding a frame.
 * @param {string} appDir
 * @param {string} iconPath
 * @returns {boolean} Whether the Finder icon changed.
 */
export function applyFinderIcon(appDir, iconPath) {
  if (process.platform !== "darwin") return false;

  const hash = createHash("sha256").update(readFileSync(iconPath)).digest("hex");
  const customIcon = join(appDir, "Icon\r");
  if (existsSync(customIcon)) {
    try {
      const previous = execFileSync("xattr", ["-p", HASH_ATTRIBUTE, customIcon], {
        encoding: "utf8",
        stdio: "pipe",
      }).trim();
      if (previous === hash) return false;
    } catch {
      // The icon has not been set by this script yet.
    }
  }

  execFileSync("osascript", ["-l", "JavaScript", "-e", SET_ICON, iconPath, appDir], {
    stdio: "pipe",
  });
  execFileSync("xattr", ["-w", HASH_ATTRIBUTE, hash, customIcon], { stdio: "pipe" });
  return true;
}
