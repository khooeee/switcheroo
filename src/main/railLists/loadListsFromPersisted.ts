import type { SessionRailLists } from "./SessionRailLists";

export function loadListsFromPersisted(
  pinned: string[],
  unpinned: string[],
): { lists: SessionRailLists; openIds: string[] } {
  const seen = new Set<string>();
  const pinnedIds: string[] = [];
  const unpinnedIds: string[] = [];
  for (const id of pinned) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    pinnedIds.push(id);
  }
  for (const id of unpinned) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unpinnedIds.push(id);
  }
  return {
    lists: { pinnedIds, unpinnedIds },
    openIds: [...pinnedIds, ...unpinnedIds],
  };
}
