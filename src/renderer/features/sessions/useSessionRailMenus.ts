import { useEffect, useRef, useState } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { SWITCHBOARD_ID } from "../../../shared/switchboardId";
import type { MenuState } from "./railMenuState";
import type { RenameTarget } from "./renameTarget";

/** Context menus, rename target, and window-event wiring for the session rail. */
export function useSessionRailMenus(
  activeTabId: ActiveTabId,
  sessions: Session[],
  toggleUnread: (sessionId: string) => void,
) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [rename, setRename] = useState<RenameTarget | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenu(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  useEffect(() => {
    const startRename = () => {
      if (activeTabId === SWITCHBOARD_ID) return;
      const session = sessions.find((item) => item.id === activeTabId);
      if (session) {
        setMenu(null);
        setRename({ kind: "session", session });
        return;
      }
      for (const parent of sessions) {
        const tab = parent.tabs.find((item) => item.tabId === activeTabId);
        if (tab) {
          setMenu(null);
          setRename({ kind: "tab", tab });
          return;
        }
      }
    };
    window.addEventListener("switcheroo:rename-session", startRename);
    return () => window.removeEventListener("switcheroo:rename-session", startRename);
  }, [activeTabId, sessions]);

  useEffect(() => {
    const onToggleUnread = () => {
      if (activeTabId === SWITCHBOARD_ID) return;
      if (!sessions.some((session) => session.id === activeTabId)) return;
      toggleUnread(activeTabId);
    };
    window.addEventListener("switcheroo:mark-unread", onToggleUnread);
    return () => window.removeEventListener("switcheroo:mark-unread", onToggleUnread);
  }, [activeTabId, sessions, toggleUnread]);

  return { menu, setMenu, rename, setRename, menuRef };
}
