import { useEffect } from "react";
import { refreshSessionFiles } from "./refreshSessionFiles";

/** While the session's explorer is shown: catch up on changes made meanwhile, then follow live ones. */
export function useSessionFileWatch(sessionId: string): void {
  useEffect(() => {
    refreshSessionFiles(sessionId, null);
    void window.switcheroo.watchSessionFiles(sessionId);
    const stop = window.switcheroo.onSessionFilesChanged(({ sessionId: changed, paths }) => {
      if (changed === sessionId) refreshSessionFiles(sessionId, paths);
    });
    return () => {
      stop();
      void window.switcheroo.unwatchSessionFiles(sessionId);
    };
  }, [sessionId]);
}
