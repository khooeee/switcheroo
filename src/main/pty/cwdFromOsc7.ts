const OSC7_RE = /\x1b\]7;file:\/\/[^\x07\x1b]*?(\/[^\x07\x1b]*)\x07/g;
const OSC7_ST_RE = /\x1b\]7;file:\/\/[^\x1b]*?(\/[^\x1b]*)\x1b\\/g;

/** Last cwd reported by OSC 7 escape sequences in terminal output, if any. */
export function cwdFromOsc7(data: string): string | null {
  let last: string | null = null;
  for (const re of [OSC7_RE, OSC7_ST_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(data))) {
      try {
        last = decodeURIComponent(match[1] ?? "");
      } catch {
        last = match[1] ?? null;
      }
    }
  }
  return last;
}
