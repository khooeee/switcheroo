import { useCallback, useSyncExternalStore } from "react";
import type { ExplorerState } from "./ExplorerState";
import { explorerStore } from "./explorerStore";

export function useExplorerState(sessionId: string): ExplorerState {
  const getSnapshot = useCallback(() => explorerStore.get(sessionId), [sessionId]);
  return useSyncExternalStore(explorerStore.subscribe, getSnapshot);
}
