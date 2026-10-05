import { MAX_PINNED_SESSIONS } from "../../shared/maxPinnedSessions";
import type { SessionRailLists } from "./SessionRailLists";

export function pinSessionInLists(lists: SessionRailLists, sessionId: string): SessionRailLists {
  if (lists.pinnedIds.includes(sessionId)) return lists;
  if (lists.pinnedIds.length >= MAX_PINNED_SESSIONS) return lists;
  return {
    pinnedIds: [sessionId, ...lists.pinnedIds],
    unpinnedIds: lists.unpinnedIds.filter((id) => id !== sessionId),
  };
}
