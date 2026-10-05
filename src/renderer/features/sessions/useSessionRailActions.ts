import { useCallback } from "react";

/** Stable SessionRail IPC callbacks (avoid inline lambdas if the rail is memoized later). */
export function useSessionRailActions() {
  const onCloseSession = useCallback((id: string) => {
    void window.switcheroo.closeSession(id);
  }, []);
  const onCloseTab = useCallback((tabId: string) => {
    void window.switcheroo.closeTab(tabId);
  }, []);
  const onStop = useCallback((id: string) => {
    void window.switcheroo.cancelPrompt(id).catch(console.error);
  }, []);
  const onRenameSession = useCallback((id: string, title: string) => {
    void window.switcheroo.renameSession(id, title);
  }, []);
  const onRenameTab = useCallback((tabId: string, title: string) => {
    void window.switcheroo.renameTab(tabId, title);
  }, []);
  const onNewTerminal = useCallback((sessionId: string) => {
    void window.switcheroo.createTerminalTab(sessionId);
  }, []);
  const onToggleExpanded = useCallback((sessionId: string, expanded: boolean) => {
    void window.switcheroo.setTabsExpanded(sessionId, expanded);
  }, []);
  const onReorderTab = useCallback((sessionId: string, tabId: string, toIndex: number) => {
    void window.switcheroo.reorderTab(sessionId, tabId, toIndex);
  }, []);
  const onMoveTab = useCallback((tabId: string, toSessionId: string, toIndex: number) => {
    void window.switcheroo.moveTab(tabId, toSessionId, toIndex);
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
    onCloseTab,
    onStop,
    onRenameSession,
    onRenameTab,
    onNewTerminal,
    onToggleExpanded,
    onReorderTab,
    onMoveTab,
    onFork,
    onPin,
    onUnpin,
  };
}
