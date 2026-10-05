/** Cmd or Ctrl (not both) + `key`, no Alt, Shift only when `shift`. */
export function modKey(event: KeyboardEvent, key: string, shift = false): boolean {
  if (!(event.metaKey || event.ctrlKey) || (event.metaKey && event.ctrlKey)) return false;
  if (event.altKey || event.shiftKey !== shift) return false;
  return event.key.toLowerCase() === key;
}
