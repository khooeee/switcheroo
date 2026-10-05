import type { RefObject } from "react";
import type { SessionTab } from "../../../shared/types";
import "../settings/menus.css";
import "../settings/settingsShortcuts.css";

export function SessionRailChildMenu({
  menuRef,
  tab,
  sessionId,
  x,
  y,
  onRename,
  onNewTerminal,
  onClose,
  onDismiss,
}: {
  menuRef: RefObject<HTMLDivElement | null>;
  tab: SessionTab;
  sessionId: string;
  x: number;
  y: number;
  onRename: (tab: SessionTab) => void;
  onNewTerminal: (sessionId: string) => void;
  onClose: (tabId: string) => void;
  onDismiss: () => void;
}) {
  return (
    <div ref={menuRef} className="context-menu" role="menu" style={{ left: x, top: y }}>
      <button
        type="button"
        role="menuitem"
        className="context-item"
        onClick={() => {
          onRename(tab);
          onDismiss();
        }}
        aria-keyshortcuts="Meta+R Control+R"
      >
        Rename...
        <kbd className="settings-shortcut">⌘R</kbd>
      </button>
      <button
        type="button"
        role="menuitem"
        className="context-item"
        aria-keyshortcuts="Meta+T Control+T"
        onClick={() => {
          onNewTerminal(sessionId);
          onDismiss();
        }}
      >
        New Terminal
        <kbd className="settings-shortcut">⌘T</kbd>
      </button>
      <button
        type="button"
        role="menuitem"
        className="context-item"
        aria-keyshortcuts="Meta+W Control+W"
        onClick={() => {
          onClose(tab.tabId);
          onDismiss();
        }}
      >
        Close
        <kbd className="settings-shortcut">⌘W</kbd>
      </button>
    </div>
  );
}
