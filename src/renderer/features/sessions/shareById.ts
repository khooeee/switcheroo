import { isSameJson } from "./isSameJson";

function reuseIfSame<T>(prev: T, next: T): T {
  return isSameJson(prev, next) ? prev : next;
}

/**
 * Structural sharing for id-keyed lists from IPC: keep `prev` entries (and `prev` itself)
 * when unchanged so memoized rows skip re-render.
 */
export function shareById<T extends { id: string }>(
  prev: readonly T[],
  next: readonly T[],
  share: (prev: T, next: T) => T = reuseIfSame,
): T[] {
  const byId = new Map(prev.map((item) => [item.id, item]));
  const shared = next.map((item) => {
    const old = byId.get(item.id);
    return old ? share(old, item) : item;
  });
  const unchanged =
    shared.length === prev.length && shared.every((item, index) => item === prev[index]);
  return unchanged ? (prev as T[]) : shared;
}
