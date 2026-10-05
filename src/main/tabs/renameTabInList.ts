import type { SessionTab } from "../../shared/session";

export function renameTabInList(tabs: SessionTab[], tabId: string, title: string): SessionTab[] | null {
  const trimmed = title.trim();
  if (!trimmed) return null;
  const index = tabs.findIndex((t) => t.tabId === tabId);
  if (index < 0) return null;
  const next = tabs.slice();
  const current = next[index];
  if (!current) return null;
  next[index] = { ...current, title: trimmed };
  return next;
}
