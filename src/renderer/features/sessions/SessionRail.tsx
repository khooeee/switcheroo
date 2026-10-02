import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { ActiveSessionId, Session } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";
import { SettingsMenu } from "../settings/SettingsMenu";
import { applyRailWidth, readRailWidth } from "./railWidth";
import { MAX_PINNED_SESSIONS } from "../../../shared/maxPinnedSessions";
import { flatRailSessions } from "./flatRailSessions";
import { requestFocusPane } from "../shortcuts/paneFocus";
import { SessionRailMenu } from "./SessionRailMenu";
import { SessionRailPinButton } from "./SessionRailPinButton";
import { SessionRailRename } from "./SessionRailRename";
import { startPinnedSessionDrag } from "./startPinnedSessionDrag";
import { useScrollActiveRailSession } from "./useScrollActiveRailSession";
import { useSessionDoneDots } from "./useSessionDoneDots";
import "./sessionSpinner.css";
import "./sessionDropIndicator.css";
import "./sessionRailPin.css";

interface Props {
  pinned: Session[];
  unpinned: Session[];
  activeSessionId: ActiveSessionId;
  onSelect: (id: ActiveSessionId) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
  onStop: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onFork: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onReorderPinned: (sessionIds: string[]) => void;
}

export function SessionRail({
  pinned,
  unpinned,
  activeSessionId,
  onSelect,
  onAdd,
  onClose,
  onStop,
  onRename,
  onFork,
  onPin,
  onUnpin,
  onReorderPinned,
}: Props) {
  const [menu, setMenu] = useState<{ session: Session; pinned: boolean; x: number; y: number } | null>(null);
  const [rename, setRename] = useState<Session | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropBeforeId, setDropBeforeId] = useState<string | null | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const skipClick = useRef<string | null>(null);
  const allSessions = flatRailSessions(pinned, unpinned);
  const anyThinking = allSessions.some((session) => session.status === "running");
  const canPin = pinned.length < MAX_PINNED_SESSIONS;
  const doneDots = useSessionDoneDots(activeSessionId);

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

  const applyClick = (sessionId: string) => {
    if (skipClick.current === sessionId) {
      skipClick.current = null;
      return;
    }
    onSelect(sessionId);
  };

  const openMenu = (event: ReactMouseEvent, session: Session, isPinned: boolean) => {
    event.preventDefault();
    setMenu({ session, pinned: isPinned, x: event.clientX, y: event.clientY });
  };

  const renderRow = (session: Session, index: number, listLength: number, isPinned: boolean) => {
    if (rename?.id === session.id) {
      return (
        <SessionRailRename
          key={session.id}
          title={session.title}
          onSave={(title) => {
            onRename(session.id, title);
            setRename(null);
            requestFocusPane("prompt");
          }}
          onCancel={() => setRename(null)}
        />
      );
    }
    const dropAfter = dropBeforeId === null && index === listLength - 1;
    return (
      <button
        key={session.id}
        type="button"
        data-pinned-session-id={isPinned ? session.id : undefined}
        className={`rail-session ${activeSessionId === session.id ? "active" : ""} ${session.status === "connecting" ? "creating" : ""} ${isPinned && dragId === session.id ? "dragging" : ""} ${isPinned && dropBeforeId === session.id ? "drop-before" : ""} ${isPinned && dropAfter ? "drop-after" : ""}`}
        data-tooltip={`${session.title}\n${session.cwd}\n(${session.status === "connecting" ? "Creating" : session.status})`}
        data-tooltip-side="right"
        onPointerDown={
          isPinned
            ? (e) =>
                startPinnedSessionDrag({
                  event: e,
                  sessionId: session.id,
                  pinnedIds: pinned.map((s) => s.id),
                  scrollRef,
                  setDragId,
                  setDropBeforeId,
                  skipClick,
                  onReorder: onReorderPinned,
                })
            : undefined
        }
        onClick={() => applyClick(session.id)}
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest(".rail-pin-btn")) return;
          event.preventDefault();
          setRename(session);
        }}
        onContextMenu={(e) => openMenu(e, session, isPinned)}
      >
        <span className="rail-label">{session.title}</span>
        {(session.status === "running" || doneDots.has(session.id) || isPinned || canPin) && (
          <span className="rail-session-end">
            {session.status === "running" ? (
              <span className="rail-spinner" role="status" aria-label="Agent thinking" />
            ) : doneDots.has(session.id) ? (
              <span className="rail-done" role="status" aria-label="Turn complete" />
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
      <div className="rail-sessions">
        <div className="rail-scroll" ref={scrollRef}>
          {pinned.map((session, index) => renderRow(session, index, pinned.length, true))}
          {pinned.length > 0 && unpinned.length > 0 && (
            <div className="rail-pin-divider" role="separator" aria-hidden="true" />
          )}
          {unpinned.map((session, index) => renderRow(session, index, unpinned.length, false))}
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
            x={menu.x}
            y={menu.y}
            onRename={setRename}
            onFork={onFork}
            onPin={onPin}
            onUnpin={onUnpin}
            onStop={onStop}
            onClose={onClose}
            onDismiss={() => setMenu(null)}
          />,
          document.body,
        )}
    </aside>
  );
}
