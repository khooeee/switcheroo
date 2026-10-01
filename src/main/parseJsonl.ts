/** Parse a JSONL body into items; blank lines are ignored. */
export function parseJsonl<T>(raw: string): T[] {
  return raw
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}
