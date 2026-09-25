import { readFileSync, unlinkSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * Patch the prebuilt Electron.app Info.plist so macOS Dock / Cmd+Tab show
 * the product name instead of "Electron" during `npm start`.
 * Runtime APIs cannot change that label.
 */
const NAME_KEYS = ["CFBundleName", "CFBundleDisplayName"];

function productName() {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  return pkg.productName || "Switcheroo";
}

function plistPath() {
  const require = createRequire(import.meta.url);
  const electronBin = require("electron");
  return join(dirname(electronBin), "..", "Info.plist");
}

function readKey(plist, key) {
  const text = readFileSync(plist, "utf8");
  const match = text.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
  return match?.[1] ?? "";
}

function writeKey(plist, key, value) {
  const text = readFileSync(plist, "utf8");
  const next = text.replace(
    new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`),
    `$1${value}$2`,
  );
  if (next === text) {
    throw new Error(`Could not set ${key} in ${plist}`);
  }
  // Break hardlinks into the package store before rewriting.
  const original = readFileSync(plist);
  unlinkSync(plist);
  writeFileSync(plist, original);
  writeFileSync(plist, next);
}

const name = productName();
const plist = plistPath();
if (!existsSync(plist)) {
  console.warn(`[brand-dev-electron] missing ${plist}`);
  process.exit(0);
}

const stale = NAME_KEYS.filter((key) => readKey(plist, key) !== name);
if (stale.length === 0) process.exit(0);

for (const key of stale) writeKey(plist, key, name);
console.log(`[brand-dev-electron] ${plist} → ${name}`);
