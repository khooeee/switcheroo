import type { SessionTab } from "../session";

export function childMatchesFilter(tab: SessionTab, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    tab.title.toLowerCase().includes(needle) ||
    (tab.kind === "terminal" && tab.cwd.toLowerCase().includes(needle))
  );
}
