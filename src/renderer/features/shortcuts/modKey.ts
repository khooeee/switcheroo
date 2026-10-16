/** Cmd (no Ctrl or Alt) + `key`, Shift only when `shift`. */
export function modKey(event: KeyboardEvent, key: string, shift = false): boolean {
  if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey !== shift) return false;
  return event.key.toLowerCase() === key;
}
