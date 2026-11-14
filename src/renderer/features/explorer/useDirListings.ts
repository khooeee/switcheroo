import { useCallback, useSyncExternalStore } from "react";
import type { DirListing } from "./DirListing";
import { dirListingStore } from "./dirListingStore";

/** Loaded folders of one session, keyed by relative path ("" is the root). */
export function useDirListings(sessionId: string): Record<string, DirListing> {
  const getSnapshot = useCallback(() => dirListingStore.forSession(sessionId), [sessionId]);
  return useSyncExternalStore(dirListingStore.subscribe, getSnapshot);
}
