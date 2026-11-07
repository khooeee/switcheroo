import { isMac } from "./isMac";

/** Primary modifier (Cmd on macOS, Ctrl elsewhere; never both, no Alt) + `key`, Shift only when `shift`. */
export function modKey(event: KeyboardEvent, key: string, shift = false): boolean {
  const primary = isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (!primary || event.altKey || event.shiftKey !== shift) return false;
  return event.key.toLowerCase() === key;
}
