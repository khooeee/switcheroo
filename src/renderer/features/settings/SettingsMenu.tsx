import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toggleStoredTheme } from "../theme/theme";
import { toggleDetailsVisible } from "./details";

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, bottom: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ left: rect.right + 8, bottom: window.innerHeight - rect.bottom });
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="rail-settings" ref={rootRef}>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="settings-menu"
            role="menu"
            style={{ left: pos.left, bottom: pos.bottom }}
          >
            <button
              type="button"
              role="menuitem"
              className="settings-item"
              onClick={() => toggleDetailsVisible()}
            >
              Toggle Details
            </button>
            <button
              type="button"
              role="menuitem"
              className="settings-item"
              onClick={() => toggleStoredTheme()}
            >
              Toggle Theme
            </button>
          </div>,
          document.body,
        )}
      <button
        type="button"
        className={`rail-tab ${open ? "active" : ""}`}
        title="Settings"
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          const rect = rootRef.current?.getBoundingClientRect();
          if (rect) {
            setPos({ left: rect.right + 8, bottom: window.innerHeight - rect.bottom });
          }
          setOpen(true);
        }}
      >
        <GearIcon />
      </button>
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
