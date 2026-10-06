/** `base` with each turn in `updates` replacing the turn with the same id, or appended. */
export function mergeTurnsById<T extends { id: string }>(base: T[], updates: T[]): T[] {
  if (!updates.length) return base;
  const next = base.slice();
  for (const turn of updates) {
    const index = next.findIndex((entry) => entry.id === turn.id);
    if (index >= 0) next[index] = turn;
    else next.push(turn);
  }
  return next;
}
