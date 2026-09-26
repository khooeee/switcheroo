/** Inclusive range of session ids between two points in rail order. */
export function sessionIdsInRange(orderedIds: string[], fromId: string, toId: string): string[] {
  const from = orderedIds.indexOf(fromId);
  const to = orderedIds.indexOf(toId);
  if (from < 0 && to < 0) return [];
  if (from < 0) return [toId];
  if (to < 0) return [fromId];
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  return orderedIds.slice(start, end + 1);
}
