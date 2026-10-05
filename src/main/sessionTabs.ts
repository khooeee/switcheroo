import { randomUUID } from "node:crypto";
import type { SessionTab } from "../shared/types";

/** Normalize persisted child tabs; drop unknown/invalid entries. */
export function normalizeSessionTabs(value: unknown): SessionTab[] {
  if (!Array.isArray(value)) return [];
  const tabs: SessionTab[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const tab = entry as Partial<SessionTab>;
    if (typeof tab.tabId !== "string" || !tab.tabId) continue;
    if (tab.kind !== "terminal") continue;
    if (typeof tab.title !== "string" || !tab.title.trim()) continue;
    if (typeof tab.cwd !== "string") continue;
    tabs.push({
      tabId: tab.tabId,
      kind: "terminal",
      title: tab.title.trim(),
      cwd: tab.cwd,
    });
  }
  return tabs;
}

export function readTabsExpanded(value: unknown): boolean {
  return value !== false;
}

/** Next default title: Terminal, Terminal 2, Terminal 3, … */
export function nextTerminalTitle(existing: SessionTab[]): string {
  const used = new Set(
    existing.filter((t) => t.kind === "terminal").map((t) => t.title.toLowerCase()),
  );
  if (!used.has("terminal")) return "Terminal";
  for (let n = 2; ; n++) {
    const title = `Terminal ${n}`;
    if (!used.has(title.toLowerCase())) return title;
  }
}

export function createTerminalTab(cwd: string, existing: SessionTab[]): SessionTab {
  return {
    tabId: randomUUID(),
    kind: "terminal",
    title: nextTerminalTitle(existing),
    cwd,
  };
}

export function findTabOwner(
  sessions: Iterable<{ id: string; tabs: SessionTab[] }>,
  tabId: string,
): { sessionId: string; tab: SessionTab; index: number } | null {
  for (const session of sessions) {
    if (session.id === tabId) continue;
    const index = session.tabs.findIndex((t) => t.tabId === tabId);
    if (index < 0) continue;
    const tab = session.tabs[index];
    if (!tab) continue;
    return { sessionId: session.id, tab, index };
  }
  return null;
}

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

export function removeTabFromList(tabs: SessionTab[], tabId: string): SessionTab[] | null {
  const index = tabs.findIndex((t) => t.tabId === tabId);
  if (index < 0) return null;
  return tabs.filter((t) => t.tabId !== tabId);
}

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

export function updateTabCwd(tabs: SessionTab[], tabId: string, cwd: string): SessionTab[] {
  return tabs.map((tab) => (tab.tabId === tabId && tab.kind === "terminal" ? { ...tab, cwd } : tab));
}
