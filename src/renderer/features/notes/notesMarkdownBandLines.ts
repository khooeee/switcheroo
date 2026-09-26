/** Split a notes band segment into one row per source line (trailing newline dropped). */

export function notesMarkdownBandLines(text: string): string[] {
  const lines = text.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}
