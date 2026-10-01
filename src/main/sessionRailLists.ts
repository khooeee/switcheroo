import { MAX_PINNED_SESSIONS } from "../shared/maxPinnedSessions";

/** Pinned and unpinned session id lists (source of truth for rail order). */
export interface SessionRailLists {
  pinnedIds: string[];
  unpinnedIds: string[];
}

export function removeSessionFromLists(lists: SessionRailLists, sessionId: string): SessionRailLists {
  return {
    pinnedIds: lists.pinnedIds.filter((id) => id !== sessionId),
    unpinnedIds: lists.unpinnedIds.filter((id) => id !== sessionId),
  };
}

export function pinSessionInLists(lists: SessionRailLists, sessionId: string): SessionRailLists {
  if (lists.pinnedIds.includes(sessionId)) return lists;
  if (lists.pinnedIds.length >= MAX_PINNED_SESSIONS) return lists;
  return {
    pinnedIds: [...lists.pinnedIds, sessionId],
    unpinnedIds: lists.unpinnedIds.filter((id) => id !== sessionId),
  };
}

export function unpinSessionInLists(lists: SessionRailLists, sessionId: string): SessionRailLists {
  if (!lists.pinnedIds.includes(sessionId)) return lists;
  return {
    pinnedIds: lists.pinnedIds.filter((id) => id !== sessionId),
    unpinnedIds: [sessionId, ...lists.unpinnedIds.filter((id) => id !== sessionId)],
  };
}

export function prependUnpinnedInLists(lists: SessionRailLists, sessionId: string): SessionRailLists {
  if (lists.pinnedIds.includes(sessionId)) return lists;
  return {
    pinnedIds: lists.pinnedIds,
    unpinnedIds: [sessionId, ...lists.unpinnedIds.filter((id) => id !== sessionId)],
  };
}

/** Insert at the top of pinned; falls back to unpinned when at the pin cap. */
export function prependPinnedInLists(lists: SessionRailLists, sessionId: string): SessionRailLists {
  if (lists.pinnedIds.includes(sessionId)) {
    return {
      pinnedIds: [sessionId, ...lists.pinnedIds.filter((id) => id !== sessionId)],
      unpinnedIds: lists.unpinnedIds,
    };
  }
  if (lists.pinnedIds.length >= MAX_PINNED_SESSIONS) {
    return prependUnpinnedInLists(lists, sessionId);
  }
  return {
    pinnedIds: [sessionId, ...lists.pinnedIds],
    unpinnedIds: lists.unpinnedIds.filter((id) => id !== sessionId),
  };
}

/** Rewrite pinned order; unknown ids are dropped, missing pinned ids are appended. */
export function reorderPinnedInLists(
  lists: SessionRailLists,
  orderedPinnedIds: string[],
  openIds: Set<string>,
): SessionRailLists {
  const pinnedSet = new Set(lists.pinnedIds.filter((id) => openIds.has(id)));
  const nextPinned: string[] = [];
  for (const id of orderedPinnedIds) {
    if (!pinnedSet.has(id)) continue;
    nextPinned.push(id);
    pinnedSet.delete(id);
  }
  for (const id of lists.pinnedIds) {
    if (pinnedSet.has(id)) nextPinned.push(id);
  }
  return { pinnedIds: nextPinned, unpinnedIds: lists.unpinnedIds };
}

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
