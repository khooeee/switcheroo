import { useEffect, useRef } from "react";
import type { ActiveSessionId, Session } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";
import { isComposerDraftEmpty } from "../chat/useComposerDraft";
import { useSessionShortcuts } from "../sessions/useSessionShortcuts";
import { toggleDetailsVisible } from "../settings/details";
import { usePaneFocusCycle } from "./usePaneFocusCycle";
import { useSessionFocusShortcuts } from "./useSessionFocusShortcuts";

function modKey(event: KeyboardEvent, key: string, shift = false): boolean {
  if (!(event.metaKey || event.ctrlKey) || (event.metaKey && event.ctrlKey)) return false;
  if (event.altKey || event.shiftKey !== shift) return false;
  return event.key.toLowerCase() === key;
}

/** Window-level shortcuts: find, sessions, pin, focus, rename, fork, stop, close, zen, Escape. */
export function useAppShortcuts({
  pinned,
  unpinned,
  activeSessionId,
  activeSession,
  selectSession,
  showNewSession,
  showFindInSessions,
  findOpen,
  rightRailOpen,
  setFindOpen,
  setFindQuery,
  setShowNewSession,
  setShowFindInSessions,
  onCloseRightRail,
}: {
  pinned: Session[];
  unpinned: Session[];
  activeSessionId: ActiveSessionId;
  activeSession: Session | null;
  selectSession: (id: ActiveSessionId) => void;
  showNewSession: boolean;
  showFindInSessions: boolean;
  findOpen: boolean;
  rightRailOpen: boolean;
  setFindOpen: (open: boolean) => void;
  setFindQuery: (query: string) => void;
  setShowNewSession: (open: boolean) => void;
  setShowFindInSessions: (open: boolean) => void;
  onCloseRightRail: () => void;
}): number {
  const blocked = showNewSession || showFindInSessions;
  const findInSessionsOpen = useRef(false);
  findInSessionsOpen.current = showFindInSessions;
  const activeId = useRef(activeSessionId);
  activeId.current = activeSessionId;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const runningId = useRef<string | null>(null);
  runningId.current = activeSession?.status === "running" ? activeSession.id : null;
  const forkableId = useRef<string | null>(null);
  forkableId.current = activeSession?.supportsFork ? activeSession.id : null;

  const promptFocus = useSessionFocusShortcuts(activeSessionId, blocked);
  usePaneFocusCycle({
    hasPrompt: activeSessionId !== SWITCHBOARD_ID,
    detailsOpen: rightRailOpen,
    blocked,
  });
  useSessionShortcuts(pinned, unpinned, activeSessionId, selectSession, blocked);

  useEffect(() => {
    const closeActive = () => {
      if (blockedRef.current || activeId.current === SWITCHBOARD_ID) return;
      void window.switcheroo.closeSession(activeId.current);
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
      if (document.querySelector("dialog[open]") || findInSessionsOpen.current) return;
      setFindOpen(true);
    };
    const openFindSessions = () => {
      if (document.querySelector("dialog[open]")) return;
      setFindOpen(false);
      setFindQuery("");
      setShowFindInSessions(true);
    };
    const openNewSession = () => {
      if (!document.querySelector("dialog[open]")) setShowNewSession(true);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;

      if (event.key === "/" && event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        if (event.repeat) return;
        event.preventDefault();
        toggleDetailsVisible();
        return;
      }

      if (
        event.key.toLowerCase() === "c"
        && event.ctrlKey
        && !event.metaKey
        && !event.altKey
        && !event.shiftKey
      ) {
        if (document.querySelector("dialog[open]") || blockedRef.current) return;
        if (!runningId.current) return;
        event.preventDefault();
        stopActive();
        return;
      }

      if (
        event.key.toLowerCase() === "d"
        && event.ctrlKey
        && !event.metaKey
        && !event.altKey
        && !event.shiftKey
      ) {
        if (document.querySelector("dialog[open]") || blockedRef.current) return;
        if (activeId.current === SWITCHBOARD_ID) return;
        if (!isComposerDraftEmpty(activeId.current)) return;
        event.preventDefault();
        closeActive();
        return;
      }

      if (document.querySelector("dialog[open]")) return;

      if (modKey(event, "w")) {
        if (event.repeat) return;
        if (activeId.current === SWITCHBOARD_ID) return;
        event.preventDefault();
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
        if (event.repeat) return;
        event.preventDefault();
        forkActive();
        return;
      }
      if (modKey(event, "r")) {
        if (event.repeat) return;
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("switcheroo:rename-session"));
      }
    };

    window.addEventListener("switcheroo:find", openFind);
    window.addEventListener("switcheroo:find-sessions", openFindSessions);
    window.addEventListener("switcheroo:new-session", openNewSession);
    window.addEventListener("switcheroo:fork-session", forkActive);
    window.addEventListener("switcheroo:close-session", closeActive);
    window.addEventListener("switcheroo:stop-session", stopActive);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("switcheroo:find", openFind);
      window.removeEventListener("switcheroo:find-sessions", openFindSessions);
      window.removeEventListener("switcheroo:new-session", openNewSession);
      window.removeEventListener("switcheroo:fork-session", forkActive);
      window.removeEventListener("switcheroo:close-session", closeActive);
      window.removeEventListener("switcheroo:stop-session", stopActive);
      window.removeEventListener("keydown", onKey);
    };
  }, [setFindOpen, setFindQuery, setShowFindInSessions, setShowNewSession]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (event.key !== "Escape") return;
      if (event.defaultPrevented || event.repeat || event.isComposing || blocked) return;
      if (document.querySelector('[role="menu"]')) return;
      if (findOpen) {
        setFindOpen(false);
        setFindQuery("");
        return;
      }
      if (activeSession?.status === "running") {
        event.preventDefault();
        void window.switcheroo.cancelPrompt(activeSession.id).catch(console.error);
        return;
      }
      if (rightRailOpen) {
        event.preventDefault();
        onCloseRightRail();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activeSession,
    blocked,
    findOpen,
    rightRailOpen,
    setFindOpen,
    setFindQuery,
    onCloseRightRail,
  ]);

  return promptFocus;
}
