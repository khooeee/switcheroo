import { useEffect, useRef } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session, SessionTab } from "../../../shared/session";
import { SWITCHBOARD_ID } from "../../../shared/switchboardId";
import { findChildTab } from "../../../shared/tabNav/findChildTab";
import { sessionIdForTab } from "../../../shared/tabNav/sessionIdForTab";
import { isComposerDraftEmpty } from "../chat/isComposerDraftEmpty";
import { confirmCloseSession } from "../sessions/confirmCloseSession";
import { useSessionShortcuts } from "../sessions/useSessionShortcuts";
import { toggleDetailsVisible } from "../settings/details";
import { usePromptFocusShortcut } from "./usePromptFocusShortcut";
import { ctrlOnlyKey } from "./ctrlOnlyKey";
import { dialogOpen } from "./dialogOpen";
import { modKey } from "./modKey";
import { useEscapeShortcut } from "./useEscapeShortcut";
import { useFilterFocusShortcut } from "./useFilterFocusShortcut";
import { useSessionFocusShortcuts } from "./useSessionFocusShortcuts";

/** Window-level shortcuts: find, sessions, pin, focus, rename, fork, unread, stop, close, zen, Escape. */
export function useAppShortcuts({
  pinned,
  unpinned,
  activeTabId,
  activeSession,
  activeTerminalTab,
  selectTab,
  showNewSession,
  showFindInSessions,
  findOpen,
  rightRailOpen,
  sessionFilter,
  setFindOpen,
  setFindQuery,
  setShowNewSession,
  setShowFindInSessions,
  onCloseRightRail,
}: {
  pinned: Session[];
  unpinned: Session[];
  activeTabId: ActiveTabId;
  activeSession: Session | null;
  activeTerminalTab: SessionTab | null;
  selectTab: (id: ActiveTabId) => void;
  showNewSession: boolean;
  showFindInSessions: boolean;
  findOpen: boolean;
  rightRailOpen: boolean;
  sessionFilter: string;
  setFindOpen: (open: boolean) => void;
  setFindQuery: (query: string) => void;
  setShowNewSession: (open: boolean) => void;
  setShowFindInSessions: (open: boolean) => void;
  onCloseRightRail: () => void;
}): number {
  const blocked = showNewSession || showFindInSessions;
  const findInSessionsOpen = useRef(false);
  findInSessionsOpen.current = showFindInSessions;
  const activeId = useRef(activeTabId);
  activeId.current = activeTabId;
  const sessionsRef = useRef([...pinned, ...unpinned]);
  sessionsRef.current = [...pinned, ...unpinned];
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const runningId = useRef<string | null>(null);
  runningId.current =
    activeTerminalTab ? null : activeSession?.status === "running" ? activeSession.id : null;
  const forkableId = useRef<string | null>(null);
  forkableId.current =
    activeTerminalTab ? null : activeSession?.supportsFork ? activeSession.id : null;

  const promptFocus = useSessionFocusShortcuts(
    activeTerminalTab ? SWITCHBOARD_ID : activeTabId,
    blocked,
  );
  usePromptFocusShortcut({
    hasPrompt: !!activeSession && !activeTerminalTab,
    blocked,
  });
  useFilterFocusShortcut(blocked);
  useSessionShortcuts(pinned, unpinned, activeTabId, selectTab, blocked, sessionFilter);

  useEffect(() => {
    const closeActive = () => {
      if (blockedRef.current || activeId.current === SWITCHBOARD_ID) return;
      const child = findChildTab(sessionsRef.current, activeId.current);
      if (child) {
        void window.switcheroo.closeTab(child.tab.tabId);
        return;
      }
      const session = sessionsRef.current.find((item) => item.id === activeId.current);
      if (!session) return;
      confirmCloseSession(session, (id) => {
        void window.switcheroo.closeSession(id);
      });
    };
    const forkActive = () => {
      const id = forkableId.current;
      if (!id || blockedRef.current) return;
      void window.switcheroo.forkSession(id).catch(console.error);
    };
    const stopActive = () => {
      const id = runningId.current;
      if (!id || blockedRef.current) return;
      void window.switcheroo.cancelPrompt(id).catch(console.error);
    };
    const newTerminal = () => {
      if (blockedRef.current || dialogOpen()) return;
      const parentId = sessionIdForTab(activeId.current, sessionsRef.current);
      if (!parentId) return;
      void window.switcheroo.createTerminalTab(parentId);
    };
    const openFind = () => {
      if (dialogOpen() || findInSessionsOpen.current) return;
      setFindOpen(true);
    };
    const openFindSessions = () => {
      if (dialogOpen()) return;
      setFindOpen(false);
      setFindQuery("");
      setShowFindInSessions(true);
    };
    const openNewSession = () => {
      if (!dialogOpen()) setShowNewSession(true);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;

      if (modKey(event, "/")) {
        if (event.repeat) return;
        event.preventDefault();
        toggleDetailsVisible();
        return;
      }

      if (ctrlOnlyKey(event, "c")) {
        if (dialogOpen() || blockedRef.current) return;
        if (!runningId.current) return;
        event.preventDefault();
        stopActive();
        return;
      }

      // Ctrl+D closes a chat session on empty draft; terminals keep it as shell EOF.
      if (ctrlOnlyKey(event, "d")) {
        if (dialogOpen() || blockedRef.current) return;
        if (activeId.current === SWITCHBOARD_ID) return;
        if (findChildTab(sessionsRef.current, activeId.current)) return;
        if (!isComposerDraftEmpty(activeId.current)) return;
        event.preventDefault();
        closeActive();
        return;
      }

      if (dialogOpen()) return;

      // Cmd only: Ctrl+W deletes a word in the composer.
      if (event.metaKey && modKey(event, "w")) {
        if (event.repeat) return;
        if (activeId.current === SWITCHBOARD_ID) return;
        event.preventDefault();
        closeActive();
        return;
      }

      if (modKey(event, "t")) {
        if (event.repeat) return;
        event.preventDefault();
        newTerminal();
        return;
      }

      if (modKey(event, "f", true)) {
        event.preventDefault();
        openFindSessions();
        return;
      }
      if (modKey(event, "f")) {
        if (findInSessionsOpen.current) return;
        event.preventDefault();
        setFindOpen(true);
        return;
      }
      if (modKey(event, "n")) {
        event.preventDefault();
        setShowNewSession(true);
        return;
      }
      if (modKey(event, "y")) {
        if (event.repeat) return;
        event.preventDefault();
        forkActive();
        return;
      }
      if (modKey(event, "u")) {
        if (event.repeat) return;
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("switcheroo:mark-unread"));
        return;
      }
      if (modKey(event, "r")) {
        if (event.repeat) return;
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("switcheroo:rename-session"));
      }
    };

    // Application menu clicks arrive as window events dispatched by preload.
    const menuCommands: Array<[string, () => void]> = [
      ["switcheroo:find", openFind],
      ["switcheroo:find-sessions", openFindSessions],
      ["switcheroo:new-session", openNewSession],
      ["switcheroo:new-terminal", newTerminal],
      ["switcheroo:fork-session", forkActive],
      ["switcheroo:close-session", closeActive],
      ["switcheroo:stop-session", stopActive],
    ];
    for (const [name, handler] of menuCommands) window.addEventListener(name, handler);
    window.addEventListener("keydown", onKey);
    return () => {
      for (const [name, handler] of menuCommands) window.removeEventListener(name, handler);
      window.removeEventListener("keydown", onKey);
    };
  }, [setFindOpen, setFindQuery, setShowFindInSessions, setShowNewSession]);

  useEscapeShortcut({
    activeSession,
    activeTerminalTab,
    blocked,
    findOpen,
    rightRailOpen,
    setFindOpen,
    setFindQuery,
    onCloseRightRail,
  });

  return promptFocus;
}
