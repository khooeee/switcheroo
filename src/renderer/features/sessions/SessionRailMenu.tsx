import type { RefObject } from "react";
import type { Session } from "../../../shared/types";
import "../settings/settingsShortcuts.css";

export function SessionRailMenu({
  menuRef,
  session,
  pinned,
  canPin,
  x,
  y,
  onRename,
  onFork,
  onPin,
  onUnpin,
  onClose,
  onDismiss,
}: {
  menuRef: RefObject<HTMLDivElement | null>;
  session: Session;
  pinned: boolean;
  canPin: boolean;
  x: number;
  y: number;
  onRename: (session: Session) => void;
  onFork: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onClose: (id: string) => void;
  onDismiss: () => void;
}) {
  const pinDisabled = !pinned && !canPin;
  return (
    <div ref={menuRef} className="context-menu" role="menu" style={{ left: x, top: y }}>
      <button
        type="button"
        role="menuitem"
        className="context-item"
        onClick={() => {
          onRename(session);
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
        disabled={pinDisabled}
        aria-keyshortcuts="Meta+P Control+P"
        onClick={() => {
          if (pinDisabled) return;
          if (pinned) onUnpin(session.id);
          else onPin(session.id);
          onDismiss();
        }}
      >
        {pinned ? "Unpin" : "Pin"}
        <kbd className="settings-shortcut">⌘P</kbd>
      </button>
      <button
        type="button"
        role="menuitem"
        className="context-item"
        onClick={() => {
          onFork(session.id);
          onDismiss();
        }}
      >
        Fork
      </button>
      <div className="context-separator" role="separator" />
      <button
        type="button"
        role="menuitem"
        className="context-item"
        aria-keyshortcuts="Control+D"
        onClick={() => {
          onClose(session.id);
          onDismiss();
        }}
      >
        Close
        <kbd className="settings-shortcut">⌃D</kbd>
      </button>
    </div>
  );
}
