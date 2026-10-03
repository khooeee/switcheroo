import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { ActiveSessionId, Session } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";
import { SettingsMenu } from "../settings/SettingsMenu";
import { applyRailWidth, readRailWidth } from "./railWidth";
import { MAX_PINNED_SESSIONS } from "../../../shared/maxPinnedSessions";
import { flatRailSessions } from "./flatRailSessions";
import { requestPromptFocus } from "../shortcuts/paneFocus";
import { SessionRailFilter } from "./SessionRailFilter";
import { SessionRailLabel } from "./SessionRailLabel";
import { SessionRailMenu } from "./SessionRailMenu";
import { SessionRailPinButton } from "./SessionRailPinButton";
import { SessionRailRename } from "./SessionRailRename";
import { sessionMatchesFilter } from "./sessionMatchesFilter";
import { useScrollActiveRailSession } from "./useScrollActiveRailSession";
import { useSessionUnreadDots } from "./useSessionUnreadDots";
import "./sessionSpinner.css";
import "./sessionRailPin.css";

interface Props {
  pinned: Session[];
  unpinned: Session[];
  activeSessionId: ActiveSessionId;
  filter: string;
  onFilter: (value: string) => void;
  onSelect: (id: ActiveSessionId) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
  onStop: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onFork: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
}

export function SessionRail({
  pinned,
  unpinned,
  activeSessionId,
  filter,
  onFilter,
  onSelect,
  onAdd,
  onClose,
  onStop,
  onRename,
  onFork,
  onPin,
  onUnpin,
}: Props) {
  const [menu, setMenu] = useState<{ session: Session; pinned: boolean; x: number; y: number } | null>(null);
  const [rename, setRename] = useState<Session | null>(null);
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
  const { unread: unreadDots, toggleUnread } = useSessionUnreadDots(activeSessionId);
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
      if (activeSessionId === SWITCHBOARD_ID) return;
      const session = allSessions.find((item) => item.id === activeSessionId);
      if (!session) return;
      setMenu(null);
      setRename(session);
    };
    window.addEventListener("switcheroo:rename-session", startRename);
    return () => window.removeEventListener("switcheroo:rename-session", startRename);
  }, [activeSessionId, allSessions]);

  useEffect(() => {
    const onToggleUnread = () => {
      if (activeSessionId === SWITCHBOARD_ID) return;
      toggleUnread(activeSessionId);
    };
    window.addEventListener("switcheroo:mark-unread", onToggleUnread);
    return () => window.removeEventListener("switcheroo:mark-unread", onToggleUnread);
  }, [activeSessionId, toggleUnread]);

  useScrollActiveRailSession(scrollRef, activeSessionId);

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

  const openMenu = (event: ReactMouseEvent, session: Session, isPinned: boolean) => {
    event.preventDefault();
    setMenu({ session, pinned: isPinned, x: event.clientX, y: event.clientY });
  };

  const renderRow = (session: Session, isPinned: boolean) => {
    if (rename?.id === session.id) {
      return (
        <SessionRailRename
          key={session.id}
          title={session.title}
          onSave={(title) => {
            onRename(session.id, title);
            setRename(null);
            requestPromptFocus();
          }}
          onCancel={() => setRename(null)}
        />
      );
    }
    return (
      <button
        key={session.id}
        type="button"
        className={`rail-session ${activeSessionId === session.id ? "active" : ""} ${session.status === "connecting" ? "creating" : ""}`}
        data-tooltip={`${session.title}\n${session.cwd}\n(${session.status === "connecting" ? "Creating" : session.status})`}
        data-tooltip-side="right"
        onClick={() => onSelect(session.id)}
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest(".rail-pin-btn")) return;
          event.preventDefault();
          setRename(session);
        }}
        onContextMenu={(e) => openMenu(e, session, isPinned)}
      >
        <SessionRailLabel title={session.title} />
        {(session.status === "running" || unreadDots.has(session.id) || isPinned || canPin) && (
          <span className="rail-session-end">
            {session.status === "running" ? (
              <span className="rail-spinner" role="status" aria-label="Agent thinking" />
            ) : unreadDots.has(session.id) ? (
              <span className="rail-unread" role="status" aria-label="Unread" />
            ) : null}
            {(isPinned || canPin) && (
              <SessionRailPinButton
                pinned={isPinned}
                onToggle={() => (isPinned ? onUnpin(session.id) : onPin(session.id))}
              />
            )}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="rail" aria-label="Sessions">
      <div
        className="rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sessions"
        onPointerDown={resize}
      />
      <div className="rail-switchboard-row">
        <button
          type="button"
          className={`rail-session ${activeSessionId === SWITCHBOARD_ID ? "active" : ""}`}
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
        <div className="rail-scroll" ref={scrollRef}>
          {filteredPinned.map((session) => renderRow(session, true))}
          {filteredPinned.length > 0 && filteredUnpinned.length > 0 && (
            <div className="rail-pin-divider" role="separator" aria-hidden="true" />
          )}
          {filteredUnpinned.map((session) => renderRow(session, false))}
          {noMatches ? <div className="rail-filter-empty">No matching sessions</div> : null}
        </div>
        <div className="rail-fade" aria-hidden="true" />
      </div>
      <div className="rail-footer">
        <SettingsMenu />
      </div>
      {menu &&
        createPortal(
          <SessionRailMenu
            menuRef={menuRef}
            session={menu.session}
            pinned={menu.pinned}
            canPin={canPin}
            unread={unreadDots.has(menu.session.id)}
            x={menu.x}
            y={menu.y}
            onRename={setRename}
            onFork={onFork}
            onPin={onPin}
            onUnpin={onUnpin}
            onToggleUnread={toggleUnread}
            onStop={onStop}
            onClose={onClose}
            onDismiss={() => setMenu(null)}
          />,
          document.body,
        )}
    </aside>
  );
}
