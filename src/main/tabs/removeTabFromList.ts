import type { SessionTab } from "../../shared/session";

export function removeTabFromList(tabs: SessionTab[], tabId: string): SessionTab[] | null {
  const index = tabs.findIndex((t) => t.tabId === tabId);
  if (index < 0) return null;
  return tabs.filter((t) => t.tabId !== tabId);
}
