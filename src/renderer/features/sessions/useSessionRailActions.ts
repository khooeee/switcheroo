import { useCallback } from "react";

/** Stable SessionRail IPC callbacks (avoid inline lambdas if the rail is memoized later). */
export function useSessionRailActions() {
  const onCloseSession = useCallback((id: string) => {
    void window.switcheroo.closeSession(id);
  }, []);
  const onStop = useCallback((id: string) => {
    void window.switcheroo.cancelPrompt(id).catch(console.error);
  }, []);
  const onRenameSession = useCallback((id: string, title: string) => {
    void window.switcheroo.renameSession(id, title);
  }, []);
  const onFork = useCallback((id: string) => {
    void window.switcheroo.forkSession(id).catch(console.error);
  }, []);
  const onPin = useCallback((id: string) => {
    void window.switcheroo.pinSession(id);
  }, []);
  const onUnpin = useCallback((id: string) => {
    void window.switcheroo.unpinSession(id);
  }, []);

  return {
    onCloseSession,
    onStop,
    onRenameSession,
    onFork,
    onPin,
    onUnpin,
  };
}
