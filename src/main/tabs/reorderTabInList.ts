import type { SessionTab } from "../../shared/session";

export function reorderTabInList(
  tabs: SessionTab[],
  tabId: string,
  toIndex: number,
): SessionTab[] | null {
  const from = tabs.findIndex((t) => t.tabId === tabId);
  if (from < 0) return null;
  const clamped = Math.max(0, Math.min(toIndex, tabs.length - 1));
  if (from === clamped) return tabs;
  const next = tabs.slice();
  const [moved] = next.splice(from, 1);
  if (!moved) return null;
  next.splice(clamped, 0, moved);
  return next;
}
