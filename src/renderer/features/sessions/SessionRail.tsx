import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { ActiveSessionId, Session } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";
import { SettingsMenu } from "../settings/SettingsMenu";
import { applyRailWidth, readRailWidth } from "./railWidth";
import { getSessionDropTarget } from "./getSessionDropTarget";
import { handleRailKeyDown } from "./handleRailKeyDown";
import { nextSessionSelection } from "./nextSessionSelection";
import { SessionRailMenu } from "./SessionRailMenu";
import { SessionRailRename } from "./SessionRailRename";
import "./sessionSpinner.css";
import "./sessionDropIndicator.css";

interface Props {
  sessions: Session[];
  activeSessionId: ActiveSessionId;
  onSelect: (id: ActiveSessionId) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onFork: (id: string) => void;
  onReorder: (sessionIds: string[]) => void;
}

export function SessionRail({
  sessions,
  activeSessionId,
  onSelect,
  onAdd,
  onClose,
  onRename,
  onFork,
  onReorder,
}: Props) {
  const [menu, setMenu] = useState<{ ids: string[]; x: number; y: number } | null>(null);
  const [rename, setRename] = useState<Session | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropBeforeId, setDropBeforeId] = useState<string | null | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const skipClick = useRef<string | null>(null);
  const anchorId = useRef<string | null>(null);
  const anyThinking = sessions.some((session) => session.status === "running");
  const orderedIds = sessions.map((session) => session.id);

  useEffect(() => {
    const open = new Set(orderedIds);
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => open.has(id)));
      return next.size === prev.size ? prev : next;
    });
    if (anchorId.current && !open.has(anchorId.current)) anchorId.current = null;
  }, [orderedIds.join("\0")]);

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

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, sessionId: string) => {
    if (event.button !== 0 || event.shiftKey || event.metaKey || event.ctrlKey) return;
    const startY = event.clientY;
    let pointerY = startY;
    let dragging = false;
    let order = sessions.map((session) => session.id);
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    const scroll = scrollRef.current;
    const updateTarget = () => {
      if (!dragging || !scroll) return;
      const rows = [...scroll.querySelectorAll<HTMLElement>("[data-session-id]")].map((row) => ({
        id: row.dataset.sessionId ?? "",
        top: row.getBoundingClientRect().top,
        height: row.getBoundingClientRect().height,
      }));
      const target = getSessionDropTarget(rows, sessionId, pointerY);
      order = target.order;
      setDropBeforeId(target.beforeId);
    };
    const move = (ev: PointerEvent) => {
      pointerY = ev.clientY;
      if (!dragging && Math.abs(ev.clientY - startY) < 5) return;
      if (!dragging) {
        dragging = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        setDragId(sessionId);
      }
      updateTarget();
    };
    const stop = (ev: PointerEvent) => {
      if (dragging && ev.type === "pointerup") {
        pointerY = ev.clientY;
        updateTarget();
        skipClick.current = sessionId;
        onReorder(order);
      }
      setDragId(null);
      setDropBeforeId(undefined);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      scroll?.removeEventListener("scroll", updateTarget);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    scroll?.addEventListener("scroll", updateTarget);
  };

  const applyClick = (event: ReactMouseEvent, sessionId: string) => {
    if (skipClick.current === sessionId) {
      skipClick.current = null;
      return;
    }
    const next = nextSessionSelection(
      orderedIds,
      { selected: selectedIds, anchorId: anchorId.current },
      sessionId,
      { shift: event.shiftKey, toggle: event.metaKey || event.ctrlKey },
    );
    anchorId.current = next.anchorId;
    setSelectedIds(next.selected);
    if (!event.shiftKey && !event.metaKey && !event.ctrlKey) onSelect(sessionId);
  };

  const openMenu = (event: ReactMouseEvent, session: Session) => {
    event.preventDefault();
    const ids = selectedIds.has(session.id) && selectedIds.size > 1
      ? [...selectedIds]
      : [session.id];
    if (ids.length === 1) {
      setSelectedIds(new Set(ids));
      anchorId.current = session.id;
    }
    setMenu({ ids, x: event.clientX, y: event.clientY });
  };

  return (
    <aside
      ref={railRef}
      className="rail"
      aria-label="Sessions"
      onKeyDown={(event) => {
        if (railRef.current) handleRailKeyDown(event, railRef.current, onSelect);
      }}
    >
      <div
        className="rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sessions"
        onPointerDown={resize}
      />
      <div className="rail-master-row">
        <button
          type="button"
          data-rail-id={SWITCHBOARD_ID}
          className={`rail-session ${activeSessionId === SWITCHBOARD_ID ? "active" : ""}`}
          onClick={() => {
            setSelectedIds(new Set());
            anchorId.current = null;
            onSelect(SWITCHBOARD_ID);
          }}
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
          {sessions.map((session, index) =>
            rename?.id === session.id ? (
              <SessionRailRename
                key={session.id}
                title={session.title}
                onSave={(title) => {
                  onRename(session.id, title);
                  setRename(null);
                }}
                onCancel={() => setRename(null)}
              />
            ) : (
              <button
                key={session.id}
                type="button"
                data-session-id={session.id}
                data-rail-id={session.id}
                className={`rail-session ${activeSessionId === session.id ? "active" : ""} ${selectedIds.has(session.id) ? "selected" : ""} ${session.status === "connecting" ? "creating" : ""} ${dragId === session.id ? "dragging" : ""} ${dropBeforeId === session.id ? "drop-before" : ""} ${dropBeforeId === null && index === sessions.length - 1 ? "drop-after" : ""}`}
                data-tooltip={`${session.title}\n${session.cwd}\n(${session.status === "connecting" ? "Creating" : session.status})`}
                data-tooltip-side="right"
                aria-selected={selectedIds.has(session.id)}
                onPointerDown={(e) => startDrag(e, session.id)}
                onClick={(event) => applyClick(event, session.id)}
                onContextMenu={(e) => openMenu(e, session)}
              >
                <span className="rail-label">{session.title}</span>
                {session.status === "running" && (
                  <span className="rail-spinner" role="status" aria-label="Agent thinking" />
                )}
              </button>
            ),
          )}
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
            ids={menu.ids}
            x={menu.x}
            y={menu.y}
            sessions={sessions}
            onRename={setRename}
            onFork={onFork}
            onClose={(ids) => {
              for (const id of ids) onClose(id);
              setSelectedIds(new Set());
              anchorId.current = null;
            }}
            onDismiss={() => setMenu(null)}
          />,
          document.body,
        )}
    </aside>
  );
}
