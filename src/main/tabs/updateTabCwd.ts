import type { SessionTab } from "../../shared/session";

export function updateTabCwd(tabs: SessionTab[], tabId: string, cwd: string): SessionTab[] {
  return tabs.map((tab) => (tab.tabId === tabId && tab.kind === "terminal" ? { ...tab, cwd } : tab));
}
