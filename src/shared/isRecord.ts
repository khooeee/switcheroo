/** True for a plain object (not null or an array), so its keys can be read safely. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
