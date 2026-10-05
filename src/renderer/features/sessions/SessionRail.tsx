import { useMemo, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session, SessionTab } from "../../../shared/session";
import { SWITCHBOARD_ID } from "../../../shared/switchboardId";
import { SettingsMenu } from "../settings/SettingsMenu";
import { MAX_PINNED_SESSIONS } from "../../../shared/maxPinnedSessions";
import { groupMatchesFilter } from "../../../shared/tabNav/groupMatchesFilter";
import { confirmCloseSession } from "./confirmCloseSession";
import { flatRailSessions } from "./flatRailSessions";
import { SessionRailChildMenu } from "./SessionRailChildMenu";
import { SessionRailFilter } from "./SessionRailFilter";
import { SessionRailGroup } from "./SessionRailGroup";
import { SessionRailMenu } from "./SessionRailMenu";
import { useRailColumnResize } from "./useRailColumnResize";
import { useScrollActiveRailSession } from "./useScrollActiveRailSession";
import { useSessionRailDnD } from "./useSessionRailDnD";
import { useSessionRailMenus } from "./useSessionRailMenus";
import { useSessionUnreadDots } from "./useSessionUnreadDots";
import "./sessionRail.css";
import "./sessionRailRow.css";
import "./sessionSpinner.css";
import "./sessionRailPin.css";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const allSessions = flatRailSessions(pinned, unpinned);
  const filteredPinned = useMemo(
    () => pinned.filter((session) => groupMatchesFilter(session, filter)),
    [pinned, filter],
  );
  const filteredUnpinned = useMemo(
    () => unpinned.filter((session) => groupMatchesFilter(session, filter)),
    [unpinned, filter],
  );
  const anyThinking = allSessions.some((session) => session.status === "running");
  const canPin = pinned.length < MAX_PINNED_SESSIONS;
  const { unread: unreadDots, toggleUnread } = useSessionUnreadDots(activeTabId, allSessions);
  const filterActive = filter.trim().length > 0;
  const noMatches = filterActive && filteredPinned.length === 0 && filteredUnpinned.length === 0;

  const { menu, setMenu, rename, setRename, menuRef } = useSessionRailMenus(
    activeTabId,
    allSessions,
    toggleUnread,
  );
  const dnd = useSessionRailDnD(allSessions, filter, onReorderTab, onMoveTab);
  const resize = useRailColumnResize();
  useScrollActiveRailSession(scrollRef, activeTabId);

  const openSessionMenu = (e: ReactMouseEvent, s: Session, p: boolean) => {
    e.preventDefault();
    setMenu({ kind: "session", session: s, pinned: p, x: e.clientX, y: e.clientY });
  };
  const openTabMenu = (e: ReactMouseEvent, tab: SessionTab, sessionId: string) => {
    e.preventDefault();
    setMenu({ kind: "tab", tab, sessionId, x: e.clientX, y: e.clientY });
  };

  const groupProps = (session: Session, isPinned: boolean) => ({
    session,
    isPinned,
    activeTabId,
    filter,
    canPin,
    unread: unreadDots.has(session.id),
    dragTabId: dnd.dragTabId,
    dropTarget: dnd.dropTarget,
    rename,
    setRename,
    onSelect,
    onToggleExpanded,
    onRenameSession,
    onRenameTab,
    onPin,
    onUnpin,
    onOpenSessionMenu: openSessionMenu,
    onOpenTabMenu: openTabMenu,
    onChildDragStart: dnd.onChildDragStart,
    onChildDrop: dnd.onChildDrop,
    onDropTarget: dnd.onDropTarget,
    onGroupDrop: dnd.onGroupDrop,
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
        <div className="rail-scroll" ref={scrollRef} onDragEnd={dnd.clearDrag}>
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
            onClose={() => confirmCloseSession(menu.session, onCloseSession)}
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
