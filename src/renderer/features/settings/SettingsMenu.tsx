import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toggleDetailsVisible } from "./details";
import { modLabel } from "../shortcuts/modLabel";
import { GearIcon } from "./GearIcon";
import { OPEN_SETTINGS_EVENT } from "./openSettingsEvent";
import { RemindersModal } from "../reminders/RemindersModal";
import { SettingsModal } from "./SettingsModal";
import "./menus.css";
import "./settingsShortcuts.css";

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, bottom: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeReminders = useCallback(() => {
    setRemindersOpen(false);
    rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);
  const closeThen = (action: () => Promise<void>) => () => {
    setOpen(false);
    void action();
  };

  useEffect(() => {
    const openSettings = () => setSettingsOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, openSettings);
  }, []);

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
              onClick={closeThen(window.switcheroo.openCronsFile)}
            >
              Open Crons
            </button>
            <button
              type="button"
              role="menuitem"
              className="settings-item"
              onClick={closeThen(async () => setRemindersOpen(true))}
            >
              Open Reminders
            </button>
            <button
              type="button"
              role="menuitem"
              className="settings-item"
              onClick={closeThen(async () => setSettingsOpen(true))}
            >
              Open Settings
            </button>
            <button
              type="button"
              role="menuitem"
              className="settings-item"
              onClick={closeThen(window.switcheroo.openTranscriptsFolder)}
            >
              Open Sessions Folder
            </button>
            <button
              type="button"
              role="menuitem"
              className="settings-item"
              onClick={closeThen(window.switcheroo.openVoiceLogFolder)}
            >
              Open Voice Log Folder
            </button>
            <button
              type="button"
              role="menuitem"
              className="settings-item"
              aria-keyshortcuts="Meta+/ Control+/"
              onClick={() => toggleDetailsVisible()}
            >
              Toggle Zen Mode
              <kbd className="settings-shortcut">{modLabel("/")}</kbd>
            </button>
          </div>,
          document.body,
        )}
      {remindersOpen && createPortal(<RemindersModal onClose={closeReminders} />, document.body)}
      {settingsOpen && createPortal(<SettingsModal onClose={() => setSettingsOpen(false)} />, document.body)}
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
