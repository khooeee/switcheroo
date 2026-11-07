import { useEffect, useRef } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { isComposerDraftEmpty } from "../chat/isComposerDraftEmpty";
import { useSessionShortcuts } from "../sessions/useSessionShortcuts";
import { toggleDetailsVisible } from "../settings/details";
import { ctrlOnlyKey } from "./ctrlOnlyKey";
import { dialogOpen } from "./dialogOpen";
import { modKey } from "./modKey";
import { requestPromptFocus } from "./paneFocus";
import { useEscapeShortcut } from "./useEscapeShortcut";
import { useFocusShortcut } from "./useFocusShortcut";
import { useSessionFocusShortcuts } from "./useSessionFocusShortcuts";

const focusFilter = () => window.dispatchEvent(new CustomEvent("switcheroo:focus-filter"));

/** Window-level shortcuts: find, sessions, pin, focus, rename, fork, unread, stop, close, zen, Escape. */
export function useAppShortcuts({
  pinned,
  unpinned,
  activeTabId,
  activeSession,
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
  selectTab: (id: string) => void;
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
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const runningId = useRef<string | null>(null);
  runningId.current = activeSession?.status === "running" ? activeSession.id : null;
  const forkableId = useRef<string | null>(null);
  forkableId.current = activeSession?.supportsFork ? activeSession.id : null;

  const promptFocus = useSessionFocusShortcuts(activeTabId, blocked);
  useFocusShortcut("i", !!activeSession && !blocked, requestPromptFocus);
  useFocusShortcut("g", !blocked, focusFilter);
  useSessionShortcuts(pinned, unpinned, activeTabId, selectTab, blocked, sessionFilter);

  useEffect(() => {
    const closeActive = () => {
      const id = activeId.current;
      if (!id || blockedRef.current) return;
      void window.switcheroo.closeSession(id);
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

      // Ctrl+D closes a chat session on empty draft.
      if (ctrlOnlyKey(event, "d")) {
        if (dialogOpen() || blockedRef.current) return;
        if (!activeId.current) return;
        if (!isComposerDraftEmpty(activeId.current)) return;
        event.preventDefault();
        closeActive();
        return;
      }

      if (dialogOpen()) return;

      if (modKey(event, "w")) {
        if (!activeId.current) return;
        event.preventDefault();
        if (event.repeat) return;
        closeActive();
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
        event.preventDefault();
        if (event.repeat) return;
        forkActive();
        return;
      }
      if (modKey(event, "u")) {
        event.preventDefault();
        if (event.repeat) return;
        window.dispatchEvent(new CustomEvent("switcheroo:mark-unread"));
        return;
      }
      if (modKey(event, "r")) {
        event.preventDefault();
        if (event.repeat) return;
        window.dispatchEvent(new CustomEvent("switcheroo:rename-session"));
      }
    };

    // Application menu clicks arrive as window events dispatched by preload.
    const menuCommands: Array<[string, () => void]> = [
      ["switcheroo:find", openFind],
      ["switcheroo:find-sessions", openFindSessions],
      ["switcheroo:new-session", openNewSession],
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
    blocked,
    findOpen,
    rightRailOpen,
    setFindOpen,
    setFindQuery,
    onCloseRightRail,
  });

  return promptFocus;
}
