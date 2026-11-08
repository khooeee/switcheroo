import { isMac } from "../shortcuts/isMac";
import type { FindOptions } from "./findOptions";

const KEYS: Record<string, keyof FindOptions> = { KeyC: "matchCase", KeyW: "wholeWord" };

/** ⌥⌘C / ⌥⌘W on macOS, Alt+C / Alt+W elsewhere (VS Code's find toggles). */
export function findOptionShortcut(event: KeyboardEvent): keyof FindOptions | null {
  const primary = isMac ? event.metaKey && !event.ctrlKey : !event.ctrlKey && !event.metaKey;
  if (!primary || !event.altKey || event.shiftKey) return null;
  return KEYS[event.code] ?? null;
}
