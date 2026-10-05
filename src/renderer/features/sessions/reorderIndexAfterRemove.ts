/** Adjust insert-before index for same-list reorder after the item is removed. */
export function reorderIndexAfterRemove(from: number, insertBefore: number): number {
  if (from >= 0 && from < insertBefore) return insertBefore - 1;
  return insertBefore;
}
