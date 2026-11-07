import { isMac } from "./isMac";

/** Label for the primary modifier + `key`: ⌘R on macOS, Ctrl+R elsewhere. */
export function modLabel(key: string): string {
  return isMac ? `⌘${key}` : `Ctrl+${key}`;
}
