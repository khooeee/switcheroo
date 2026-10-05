import { MAX_PINNED_SESSIONS } from "../../shared/maxPinnedSessions";
import type { SessionRailLists } from "./SessionRailLists";

export function loadListsFromPersisted(
  pinned: string[],
  unpinned: string[],
): { lists: SessionRailLists; openIds: string[] } {
  const seen = new Set<string>();
  const pinnedIds: string[] = [];
  const overflowPinned: string[] = [];
  const unpinnedIds: string[] = [];
  for (const id of pinned) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (pinnedIds.length < MAX_PINNED_SESSIONS) pinnedIds.push(id);
    else overflowPinned.push(id);
  }
  for (const id of unpinned) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unpinnedIds.push(id);
  }
  const nextUnpinned = [...overflowPinned, ...unpinnedIds];
  return {
    lists: { pinnedIds, unpinnedIds: nextUnpinned },
    openIds: [...pinnedIds, ...nextUnpinned],
  };
}
