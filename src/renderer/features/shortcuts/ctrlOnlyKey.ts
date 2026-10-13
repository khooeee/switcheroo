type KeyChord = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">;

/** Ctrl + `key` with no Cmd, Alt or Shift (terminal-style chords like Ctrl+C, Ctrl+D). */
export function ctrlOnlyKey(event: KeyChord, key: string): boolean {
  if (!event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;
  return event.key.toLowerCase() === key;
}
