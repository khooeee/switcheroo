import type { SessionTab } from "../../shared/session";

export function moveTabBetweenLists(
  fromTabs: SessionTab[],
  toTabs: SessionTab[],
  tabId: string,
  toIndex: number,
): { from: SessionTab[]; to: SessionTab[] } | null {
  const fromIndex = fromTabs.findIndex((t) => t.tabId === tabId);
  if (fromIndex < 0) return null;
  const tab = fromTabs[fromIndex];
  if (!tab) return null;
  const from = fromTabs.filter((t) => t.tabId !== tabId);
  const to = toTabs.slice();
  const clamped = Math.max(0, Math.min(toIndex, to.length));
  to.splice(clamped, 0, tab);
  return { from, to };
}
