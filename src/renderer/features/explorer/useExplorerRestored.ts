import { useCallback, useEffect, useSyncExternalStore } from "react";
import { explorerPersistence } from "./explorerPersistence";

/** Load the session's saved explorer (once) and report when it is back; true for no session. */
export function useExplorerRestored(sessionId: string | null): boolean {
  useEffect(() => {
    if (sessionId) void explorerPersistence.ensureRestored(sessionId);
  }, [sessionId]);
  const getSnapshot = useCallback(
    () => (sessionId ? explorerPersistence.isRestored(sessionId) : true),
    [sessionId],
  );
  return useSyncExternalStore(explorerPersistence.subscribe, getSnapshot);
}
