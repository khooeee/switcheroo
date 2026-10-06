#!/usr/bin/env node
/**
 * Brand the prebuilt Electron.app for macOS `npm start`.
 *
 * Dock / Cmd+Tab use the .app folder name, not just Info.plist — so we rename
 * Electron.app → <productName>.app and keep path.txt in sync.
 * Finder uses the bundle's ICNS, which must stay in sync with our app artwork.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, renameSync, utimesSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyFinderIcon } from "./apply-finder-icon.mjs";

const NAME_KEYS = ["CFBundleDisplayName", "CFBundleName"];
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function warn(message) {
  console.warn(`[brand-dev-electron] ${message}`);
}

function productName() {
  const pkg = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
  const name = pkg.productName || "Switcheroo";
  if (name.includes("/")) throw new Error(`invalid productName: ${name}`);
  return name;
}

function resolveElectronPackage() {
  return dirname(createRequire(import.meta.url).resolve("electron/package.json"));
}

function readPlistString(plistPath, key) {
  try {
    return execFileSync("plutil", ["-extract", key, "raw", "-o", "-", plistPath], {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

function writePlistString(plistPath, key, value) {
  execFileSync("plutil", ["-replace", key, "-string", value, plistPath], {
    stdio: "pipe",
  });
}

/** Rename dist/*.app to match productName and update path.txt. */
function ensureBundleName(pkgDir, name) {
  const distDir = join(pkgDir, "dist");
  const pathFile = join(pkgDir, "path.txt");
  if (!existsSync(pathFile)) {
    warn(`No ${pathFile}`);
    return null;
  }

  const relative = readFileSync(pathFile, "utf8").trim();
  const segments = relative.split("/");
  const currentName = segments[0];
  const desiredName = `${name}.app`;
  if (!currentName.endsWith(".app")) {
    warn(`Unexpected path.txt: ${relative}`);
    return null;
  }

  const desiredDir = join(distDir, desiredName);
  if (currentName === desiredName && existsSync(desiredDir)) {
    return { appDir: desiredDir, renamed: false };
  }

  const currentDir = join(distDir, currentName);
  let renamed = false;
  if (existsSync(currentDir) && currentDir !== desiredDir) {
    if (existsSync(desiredDir)) {
      warn(`Both ${currentName} and ${desiredName} exist — using ${desiredName}`);
    } else {
      renameSync(currentDir, desiredDir);
      renamed = true;
    }
  } else if (!existsSync(desiredDir)) {
    warn(`No Electron bundle under ${distDir}`);
    return null;
  }

  segments[0] = desiredName;
  try {
    writeFileSync(pathFile, segments.join("/"));
  } catch (err) {
    if (renamed && existsSync(desiredDir) && !existsSync(currentDir)) {
      try {
        renameSync(desiredDir, currentDir);
      } catch {
        warn(`Could not roll back rename in ${distDir}`);
      }
    }
    warn(`Could not update path.txt: ${err.message}`);
    return null;
  }

  return { appDir: desiredDir, renamed };
}

/** Sync Finder's bundle icon with the artwork used by Dock / Cmd+Tab. */
function syncBundleIcon(appDir, plistPath) {
  const source = join(projectRoot, "assets", "icon.icns");
  if (!existsSync(source)) {
    warn(`Missing ${source}`);
    return false;
  }

  const iconName = "icon.icns";
  const destination = join(appDir, "Contents", "Resources", iconName);
  const changed = !existsSync(destination) ||
    !readFileSync(destination).equals(readFileSync(source));
  if (changed) copyFileSync(source, destination);

  const stale = readPlistString(plistPath, "CFBundleIconFile") !== iconName;
  if (stale) writePlistString(plistPath, "CFBundleIconFile", iconName);
  const finderChanged = applyFinderIcon(appDir, join(projectRoot, "assets", "icon.png"));
  return changed || stale || finderChanged;
}

function registerBundle(appDir) {
  const lsregister =
    "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";
  if (!existsSync(lsregister)) return;
  try {
    execFileSync(lsregister, ["-f", appDir], { stdio: "pipe" });
  } catch {
    // Non-fatal: name still updates on next launch for most cases.
  }
}

function main() {
  if (process.platform !== "darwin") return;

  let name;
  try {
    name = productName();
  } catch (err) {
    warn(err.message);
    return;
  }

  let pkgDir;
  try {
    pkgDir = resolveElectronPackage();
  } catch (err) {
    warn(`Could not resolve electron: ${err.message}`);
    return;
  }

  let bundle;
  try {
    bundle = ensureBundleName(pkgDir, name);
  } catch (err) {
    warn(`Could not rename bundle: ${err.message}`);
    return;
  }
  if (!bundle) return;

  const plistPath = join(bundle.appDir, "Contents", "Info.plist");
  if (!existsSync(plistPath)) {
    warn(`Missing ${plistPath}`);
    return;
  }

  const stale = NAME_KEYS.filter((key) => readPlistString(plistPath, key) !== name);
  let iconChanged;
  try {
    for (const key of stale) writePlistString(plistPath, key, name);
    iconChanged = syncBundleIcon(bundle.appDir, plistPath);
  } catch (err) {
    warn(`Could not update bundle branding: ${err.message}`);
    return;
  }

  if (bundle.renamed || stale.length > 0 || iconChanged) {
    const now = new Date();
    utimesSync(bundle.appDir, now, now);
    registerBundle(bundle.appDir);
    console.log(`[brand-dev-electron] Dev bundle name and icon now match "${name}"`);
  }
}

try {
  main();
} catch (err) {
  warn(err instanceof Error ? err.message : String(err));
}
