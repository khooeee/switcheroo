import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import type { ActiveTabId, Session, SessionTab } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";
import { SettingsMenu } from "../settings/SettingsMenu";
import { applyRailWidth, readRailWidth } from "./railWidth";
import { MAX_PINNED_SESSIONS } from "../../../shared/maxPinnedSessions";
import { flatRailSessions } from "./flatRailSessions";
import { SessionRailChildMenu } from "./SessionRailChildMenu";
import { SessionRailFilter } from "./SessionRailFilter";
import { SessionRailGroup } from "./SessionRailGroup";
import { SessionRailMenu } from "./SessionRailMenu";
import { sessionMatchesFilter } from "./sessionMatchesFilter";
import { useScrollActiveRailSession } from "./useScrollActiveRailSession";
import { useSessionUnreadDots } from "./useSessionUnreadDots";
import "./sessionRail.css";
import "./sessionSpinner.css";
import "./sessionRailPin.css";

type RenameTarget =
  | { kind: "session"; session: Session }
  | { kind: "tab"; tab: SessionTab };

type MenuState =
  | { kind: "session"; session: Session; pinned: boolean; x: number; y: number }
  | { kind: "tab"; tab: SessionTab; sessionId: string; x: number; y: number };

interface Props {
  pinned: Session[];
  unpinned: Session[];
  activeTabId: ActiveTabId;
  filter: string;
  onFilter: (value: string) => void;
  onSelect: (id: ActiveTabId) => void;
  onAdd: () => void;
  onCloseSession: (id: string) => void;
  onCloseTab: (tabId: string) => void;
  onStop: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onRenameTab: (tabId: string, title: string) => void;
  onNewTerminal: (sessionId: string) => void;
  onToggleExpanded: (sessionId: string, expanded: boolean) => void;
  onReorderTab: (sessionId: string, tabId: string, toIndex: number) => void;
  onMoveTab: (tabId: string, toSessionId: string, toIndex: number) => void;
  onFork: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
}

export function SessionRail({
  pinned,
  unpinned,
  activeTabId,
  filter,
  onFilter,
  onSelect,
  onAdd,
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
}: Props) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [rename, setRename] = useState<RenameTarget | null>(null);
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const allSessions = flatRailSessions(pinned, unpinned);
  const filteredPinned = useMemo(
    () => pinned.filter((session) => sessionMatchesFilter(session, filter)),
    [pinned, filter],
  );
  const filteredUnpinned = useMemo(
    () => unpinned.filter((session) => sessionMatchesFilter(session, filter)),
    [unpinned, filter],
  );
  const anyThinking = allSessions.some((session) => session.status === "running");
  const canPin = pinned.length < MAX_PINNED_SESSIONS;
  const { unread: unreadDots, toggleUnread } = useSessionUnreadDots(activeTabId, allSessions);
  const filterActive = filter.trim().length > 0;
  const noMatches = filterActive && filteredPinned.length === 0 && filteredUnpinned.length === 0;

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
      const session = allSessions.find((item) => item.id === activeTabId);
      if (session) {
        setMenu(null);
        setRename({ kind: "session", session });
        return;
      }
      for (const parent of allSessions) {
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
  }, [activeTabId, allSessions]);

  useEffect(() => {
    const onToggleUnread = () => {
      if (activeTabId === SWITCHBOARD_ID) return;
      if (!allSessions.some((session) => session.id === activeTabId)) return;
      toggleUnread(activeTabId);
    };
    window.addEventListener("switcheroo:mark-unread", onToggleUnread);
    return () => window.removeEventListener("switcheroo:mark-unread", onToggleUnread);
  }, [activeTabId, allSessions, toggleUnread]);

  useScrollActiveRailSession(scrollRef, activeTabId);

  const resize = (event: ReactPointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = readRailWidth();
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev: PointerEvent) => {
      applyRailWidth(startWidth + ev.clientX - startX);
    };
    const stop = (ev: PointerEvent) => {
      applyRailWidth(startWidth + ev.clientX - startX, true);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const confirmCloseSession = (session: Session) => {
    if (session.tabs.length > 0) {
      const n = session.tabs.length;
      const ok = window.confirm(`Close this chat and ${n} terminal${n === 1 ? "" : "s"}?`);
      if (!ok) return;
    }
    onCloseSession(session.id);
  };

  const onChildDragStart = (event: ReactDragEvent, tabId: string) => {
    event.dataTransfer.setData("text/tab-id", tabId);
    event.dataTransfer.effectAllowed = "move";
    setDragTabId(tabId);
  };

  const onChildDrop = (event: ReactDragEvent, toSessionId: string, toIndex: number) => {
    event.preventDefault();
    const tabId = event.dataTransfer.getData("text/tab-id") || dragTabId;
    setDragTabId(null);
    if (!tabId) return;
    const source = allSessions.find((session) =>
      session.tabs.some((tab) => tab.tabId === tabId),
    );
    if (!source) return;
    if (source.id === toSessionId) onReorderTab(toSessionId, tabId, toIndex);
    else onMoveTab(tabId, toSessionId, toIndex);
  };

  const groupProps = (session: Session, isPinned: boolean) => ({
    session,
    isPinned,
    activeTabId,
    filter,
    canPin,
    unread: unreadDots.has(session.id),
    dragTabId,
    rename,
    setRename,
    onSelect,
    onToggleExpanded,
    onRenameSession,
    onRenameTab,
    onPin,
    onUnpin,
    onOpenSessionMenu: (e: ReactMouseEvent, s: Session, p: boolean) => {
      e.preventDefault();
      setMenu({ kind: "session", session: s, pinned: p, x: e.clientX, y: e.clientY });
    },
    onOpenTabMenu: (e: ReactMouseEvent, tab: SessionTab, sessionId: string) => {
      e.preventDefault();
      setMenu({ kind: "tab", tab, sessionId, x: e.clientX, y: e.clientY });
    },
    onChildDragStart,
    onChildDrop,
    onGroupDrop: (e: ReactDragEvent, toSessionId: string) => {
      const session = allSessions.find((item) => item.id === toSessionId);
      onChildDrop(e, toSessionId, session?.tabs.length ?? 0);
    },
  });

  return (
    <aside className="rail" aria-label="Tabs">
      <div
        className="rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize tabs"
        onPointerDown={resize}
      />
      <div className="rail-switchboard-row">
        <button
          type="button"
          className={`rail-session ${activeTabId === SWITCHBOARD_ID ? "active" : ""}`}
          onClick={() => onSelect(SWITCHBOARD_ID)}
        >
          <span className="rail-label">Switchboard</span>
          {anyThinking && (
            <span className="rail-spinner" role="status" aria-label="Agent thinking" />
          )}
        </button>
        <button type="button" className="rail-add" data-tooltip="New session" data-tooltip-align="center" onClick={onAdd}>
          +
        </button>
      </div>
      <SessionRailFilter value={filter} onChange={onFilter} />
      <div className="rail-sessions">
        <div
          className="rail-scroll"
          ref={scrollRef}
          onDragEnd={() => setDragTabId(null)}
        >
          {filteredPinned.map((session) => (
            <SessionRailGroup key={session.id} {...groupProps(session, true)} />
          ))}
          {filteredPinned.length > 0 && filteredUnpinned.length > 0 && (
            <div className="rail-pin-divider" role="separator" aria-hidden="true" />
          )}
          {filteredUnpinned.map((session) => (
            <SessionRailGroup key={session.id} {...groupProps(session, false)} />
          ))}
          {noMatches ? <div className="rail-filter-empty">No matching tabs</div> : null}
        </div>
        <div className="rail-fade" aria-hidden="true" />
      </div>
      <div className="rail-footer">
        <SettingsMenu />
      </div>
      {menu?.kind === "session" &&
        createPortal(
          <SessionRailMenu
            menuRef={menuRef}
            session={menu.session}
            pinned={menu.pinned}
            canPin={canPin}
            unread={unreadDots.has(menu.session.id)}
            x={menu.x}
            y={menu.y}
            onRename={(session) => setRename({ kind: "session", session })}
            onNewTerminal={onNewTerminal}
            onFork={onFork}
            onPin={onPin}
            onUnpin={onUnpin}
            onToggleUnread={toggleUnread}
            onStop={onStop}
            onClose={() => confirmCloseSession(menu.session)}
            onDismiss={() => setMenu(null)}
          />,
          document.body,
        )}
      {menu?.kind === "tab" &&
        createPortal(
          <SessionRailChildMenu
            menuRef={menuRef}
            tab={menu.tab}
            sessionId={menu.sessionId}
            x={menu.x}
            y={menu.y}
            onRename={(tab) => setRename({ kind: "tab", tab })}
            onNewTerminal={onNewTerminal}
            onClose={onCloseTab}
            onDismiss={() => setMenu(null)}
          />,
          document.body,
        )}
    </aside>
  );
}
