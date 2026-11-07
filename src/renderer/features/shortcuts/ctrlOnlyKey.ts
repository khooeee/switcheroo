/** Ctrl + `key` with no Cmd, Alt or Shift (terminal-style chords like Ctrl+D). */
export function ctrlOnlyKey(event: KeyboardEvent, key: string): boolean {
  if (!event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;
  return event.key.toLowerCase() === key;
}
