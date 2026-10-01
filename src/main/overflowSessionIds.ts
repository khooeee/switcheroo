/**
 * Rail ids to soft-close so the open list fits under max.
 * Drops from the end (least recently used when recent sessions are prepended).
 * Never closes protectId. Non-positive max means unlimited.
 */
export function overflowSessionIds(
  orderedIds: string[],
  max: number,
  protectId?: string,
): string[] {
  if (!Number.isFinite(max) || max <= 0 || orderedIds.length <= max) return [];
  const overflow: string[] = [];
  let remaining = orderedIds.length;
  for (let i = orderedIds.length - 1; i >= 0 && remaining > max; i--) {
    const id = orderedIds[i]!;
    if (protectId && id === protectId) continue;
    overflow.push(id);
    remaining--;
  }
  return overflow;
}
