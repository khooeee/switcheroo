/** Encode items as one JSON object per line (trailing newline when non-empty). */
export function encodeJsonl(items: unknown[]): string {
  return items.length ? `${items.map((item) => JSON.stringify(item)).join("\n")}\n` : "";
}
