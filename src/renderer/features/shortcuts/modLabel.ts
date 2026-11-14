import { isMac } from "./isMac";

/** Label for the primary modifier (+ Shift when `shift`) + `key`: ⌘R on macOS, Ctrl+R elsewhere. */
export function modLabel(key: string, shift = false): string {
  if (isMac) return `${shift ? "⇧" : ""}⌘${key}`;
  return `Ctrl+${shift ? "Shift+" : ""}${key}`;
}
