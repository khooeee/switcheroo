import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { ActiveTabId, SessionTab } from "../../../shared/types";
import { MASTER_TAB_ID } from "../../../shared/types";
import { SettingsMenu } from "../settings/SettingsMenu";
import { applyRailWidth, readRailWidth } from "./railWidth";
import "./tabSpinner.css";

interface Props {
  tabs: SessionTab[];
  activeTabId: ActiveTabId;
  onSelect: (id: ActiveTabId) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onReorder: (tabIds: string[]) => void;
}

export function TabRail({
  tabs,
  activeTabId,
  onSelect,
  onAdd,
  onClose,
  onDelete,
  onRename,
  onReorder,
}: Props) {
  const [menu, setMenu] = useState<{ tab: SessionTab; x: number; y: number } | null>(null);
  const [rename, setRename] = useState<SessionTab | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const skipClick = useRef<string | null>(null);

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

  const shown = dragOrder
    ? dragOrder.flatMap((id) => {
        const tab = tabs.find((item) => item.id === id);
        return tab ? [tab] : [];
      })
    : tabs;

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, tabId: string) => {
    if (event.button !== 0) return;
    const startY = event.clientY;
    let dragging = false;
    let order = tabs.map((tab) => tab.id);
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;

    const move = (ev: PointerEvent) => {
      if (!dragging && Math.abs(ev.clientY - startY) < 5) return;
      if (!dragging) {
        dragging = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        setDragId(tabId);
      }
      order = orderFromPointer(order, tabId, ev.clientY);
      setDragOrder(order);
    };
    const stop = () => {
      if (dragging) {
        skipClick.current = tabId;
        onReorder(order);
      }
      setDragId(null);
      setDragOrder(null);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  return (
    <aside className="rail" aria-label="Session tabs">
      <div
        className="rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize session tabs"
        onPointerDown={resize}
      />
      <div className="rail-master-row">
        <button
          type="button"
          className={`rail-tab ${activeTabId === MASTER_TAB_ID ? "active" : ""}`}
          title="Switchboard — all events"
          onClick={() => onSelect(MASTER_TAB_ID)}
        >
          <span className="rail-label">Switchboard</span>
        </button>
        <button type="button" className="rail-add" title="New session" onClick={onAdd}>
          +
        </button>
      </div>
      <div className="rail-scroll">
        {shown.map((tab) =>
          rename?.id === tab.id ? (
            <RailRename
              key={tab.id}
              title={tab.title}
              onSave={(title) => {
                onRename(tab.id, title);
                setRename(null);
              }}
              onCancel={() => setRename(null)}
            />
          ) : (
            <button
              key={tab.id}
              type="button"
              data-tab-id={tab.id}
              className={`rail-tab ${activeTabId === tab.id ? "active" : ""} ${tab.status === "connecting" ? "creating" : ""} ${dragId === tab.id ? "dragging" : ""}`}
              title={`${tab.title}\n${tab.cwd}\n(${tab.status === "connecting" ? "Creating" : tab.status})`}
              onPointerDown={(e) => startDrag(e, tab.id)}
              onClick={() => {
                if (skipClick.current === tab.id) {
                  skipClick.current = null;
                  return;
                }
                onSelect(tab.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ tab, x: e.clientX, y: e.clientY });
              }}
            >
              <span className="rail-label">{tab.title}</span>
              {tab.status === "running" && (
                <span className="rail-spinner" role="status" aria-label="Agent thinking" />
              )}
            </button>
          ),
        )}
      </div>
      <div className="rail-footer">
        <SettingsMenu />
      </div>
      {menu &&
        createPortal(
          <div
            ref={menuRef}
            className="context-menu"
            role="menu"
            style={{ left: menu.x, top: menu.y }}
          >
            <button
              type="button"
              role="menuitem"
              className="context-item"
              onClick={() => {
                setRename(menu.tab);
                setMenu(null);
              }}
            >
              Rename...
            </button>
            <button
              type="button"
              role="menuitem"
              className="context-item"
              onClick={() => {
                onClose(menu.tab.id);
                setMenu(null);
              }}
            >
              Close
            </button>
            <button
              type="button"
              role="menuitem"
              className="context-item"
              onClick={() => {
                onDelete(menu.tab.id);
                setMenu(null);
              }}
            >
              Delete
            </button>
          </div>,
          document.body,
        )}
    </aside>
  );
}

function orderFromPointer(ids: string[], dragId: string, y: number): string[] {
  const rows = [...document.querySelectorAll<HTMLElement>("[data-tab-id]")].filter(
    (el) => el.dataset.tabId !== dragId,
  );
  let index = rows.length;
  for (let i = 0; i < rows.length; i++) {
    const rect = rows[i].getBoundingClientRect();
    if (y < rect.top + rect.height / 2) {
      index = i;
      break;
    }
  }
  const next = ids.filter((id) => id !== dragId);
  next.splice(index, 0, dragId);
  return next;
}

function RailRename({
  title,
  onSave,
  onCancel,
}: {
  title: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      className="rail-rename"
      value={value}
      aria-label="Session title"
      onChange={(e) => setValue(e.target.value)}
      onBlur={onCancel}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          const next = value.trim();
          if (next) onSave(next);
          else onCancel();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
    />
  );
}
