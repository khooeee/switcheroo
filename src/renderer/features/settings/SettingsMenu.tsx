import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { toggleStoredTheme } from "../theme/theme";
import { toggleDetailsVisible } from "./details";
import { soundPreference } from "../sound/soundPreference";
import { GearIcon } from "./GearIcon";
import "./menus.css";
import "./settingsShortcuts.css";

export function SettingsMenu() {
  const soundEnabled = useSyncExternalStore(soundPreference.subscribe, soundPreference.getSnapshot);
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
              onClick={() => {
                setOpen(false);
                void window.switcheroo.openSettingsFile();
              }}
            >
              Open Settings
            </button>
            <button
              type="button"
              role="menuitem"
              className="settings-item"
              onClick={() => {
                setOpen(false);
                void window.switcheroo.openTranscriptsFolder();
              }}
            >
              Open Sessions Folder
            </button>
            <button
              type="button"
              role="menuitem"
              className="settings-item"
              aria-keyshortcuts="Meta+/"
              onClick={() => toggleDetailsVisible()}
            >
              Toggle Zen Mode
              <kbd className="settings-shortcut">⌘/</kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              className="settings-item"
              onClick={() => soundPreference.toggle()}
            >
              {soundEnabled ? "Toggle Sound Off" : "Toggle Sound On"}
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
        className={`rail-session ${open ? "active" : ""}`}
        data-tooltip="Settings"
        data-tooltip-align="center"
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
