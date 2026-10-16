/** Readline-style Ctrl+W: drop the selection, or trailing whitespace plus the word before the cursor. */
export function deleteWordBefore(
  value: string,
  start: number,
  end: number,
): { value: string; cursor: number } {
  if (start !== end) return { value: value.slice(0, start) + value.slice(end), cursor: start };
  let from = start;
  while (from > 0 && /\s/.test(value[from - 1] ?? "")) from--;
  while (from > 0 && !/\s/.test(value[from - 1] ?? "")) from--;
  return { value: value.slice(0, from) + value.slice(end), cursor: from };
}
