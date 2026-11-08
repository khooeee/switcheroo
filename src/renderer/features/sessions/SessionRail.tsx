import { useMemo, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { SettingsMenu } from "../settings/SettingsMenu";
import { VoiceButton } from "../voice/VoiceButton";
import { VoiceLogButton } from "../voiceLog/VoiceLogButton";
import { sessionMatchesFilter } from "../../../shared/tabNav/sessionMatchesFilter";
import { flatRailSessions } from "./flatRailSessions";
import { PlusIcon } from "./PlusIcon";
import { SessionRailFilter } from "./SessionRailFilter";
import { SessionRailMenu } from "./SessionRailMenu";
import { SessionRailRow } from "./SessionRailRow";
import { startRailResize } from "./startRailResize";
import { useScrollActiveRailSession } from "./useScrollActiveRailSession";
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
  onSelect: (id: string) => void;
  onAdd: () => void;
  onCloseSession: (id: string) => void;
  onStop: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
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
  onStop,
  onRenameSession,
  onFork,
  onPin,
  onUnpin,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const allSessions = flatRailSessions(pinned, unpinned);
  const filteredPinned = useMemo(
    () => pinned.filter((session) => sessionMatchesFilter(session, filter)),
    [pinned, filter],
  );
  const filteredUnpinned = useMemo(
    () => unpinned.filter((session) => sessionMatchesFilter(session, filter)),
    [unpinned, filter],
  );
  const { unread: unreadDots, toggleUnread } = useSessionUnreadDots(activeTabId);
  const filterActive = filter.trim().length > 0;
  const noMatches = filterActive && filteredPinned.length === 0 && filteredUnpinned.length === 0;

  const { menu, setMenu, rename, setRename, menuRef } = useSessionRailMenus(
    activeTabId,
    allSessions,
    toggleUnread,
  );
  useScrollActiveRailSession(scrollRef, activeTabId);

  const openSessionMenu = (e: ReactMouseEvent, s: Session, p: boolean) => {
    e.preventDefault();
    setMenu({ session: s, pinned: p, x: e.clientX, y: e.clientY });
  };

  const rowProps = (session: Session, isPinned: boolean) => ({
    session,
    isPinned,
    active: activeTabId === session.id,
    unread: unreadDots.has(session.id),
    renaming: rename?.id === session.id,
    setRename,
    onSelect,
    onRenameSession,
    onPin,
    onUnpin,
    onOpenSessionMenu: openSessionMenu,
  });

  return (
    <aside className="rail" aria-label="Tabs">
      <div
        className="rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize tabs"
        onPointerDown={startRailResize}
      />
      <button type="button" className="rail-session rail-new-session" onClick={onAdd}>
        <PlusIcon />
        <span className="rail-label">New Session</span>
      </button>
      <SessionRailFilter value={filter} onChange={onFilter} />
      <div className="rail-sessions">
        <div className="rail-scroll" ref={scrollRef}>
          {filteredPinned.map((session) => (
            <SessionRailRow key={session.id} {...rowProps(session, true)} />
          ))}
          {filteredPinned.length > 0 && filteredUnpinned.length > 0 && (
            <div className="rail-pin-divider" role="separator" aria-hidden="true" />
          )}
          {filteredUnpinned.map((session) => (
            <SessionRailRow key={session.id} {...rowProps(session, false)} />
          ))}
          {noMatches ? <div className="rail-filter-empty">No matching tabs</div> : null}
        </div>
        <div className="rail-fade" aria-hidden="true" />
      </div>
      <div className="rail-footer">
        <VoiceButton />
        <VoiceLogButton />
        <SettingsMenu />
      </div>
      {menu &&
        createPortal(
          <SessionRailMenu
            menuRef={menuRef}
            session={menu.session}
            pinned={menu.pinned}
            unread={unreadDots.has(menu.session.id)}
            x={menu.x}
            y={menu.y}
            onRename={setRename}
            onFork={onFork}
            onPin={onPin}
            onUnpin={onUnpin}
            onToggleUnread={toggleUnread}
            onStop={onStop}
            onClose={onCloseSession}
            onDismiss={() => setMenu(null)}
          />,
          document.body,
        )}
    </aside>
  );
}
