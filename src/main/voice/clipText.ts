/** Collapse whitespace and cut `text` to `max` characters with an ellipsis. */
export function clipText(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
