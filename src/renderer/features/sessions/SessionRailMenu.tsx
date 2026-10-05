import type { RefObject } from "react";
import type { Session } from "../../../shared/session";
import "../settings/menus.css";
import "../settings/settingsShortcuts.css";

export function SessionRailMenu({
  menuRef,
  session,
  pinned,
  canPin,
  unread,
  x,
  y,
  onRename,
  onNewTerminal,
  onFork,
  onPin,
  onUnpin,
  onToggleUnread,
  onStop,
  onClose,
  onDismiss,
}: {
  menuRef: RefObject<HTMLDivElement | null>;
  session: Session;
  pinned: boolean;
  canPin: boolean;
  unread: boolean;
  x: number;
  y: number;
  onRename: (session: Session) => void;
  onNewTerminal: (sessionId: string) => void;
  onFork: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onToggleUnread: (id: string) => void;
  onStop: (id: string) => void;
  onClose: (id: string) => void;
  onDismiss: () => void;
}) {
  const pinDisabled = !pinned && !canPin;
  const forkDisabled = !session.supportsFork;
  const stopDisabled = session.status !== "running";
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
        disabled={!session.cwd.trim()}
        aria-keyshortcuts="Meta+E Control+E"
        onClick={() => {
          if (!session.cwd.trim()) return;
          void window.switcheroo.openSessionInCursor(session.id).catch(console.error);
          onDismiss();
        }}
      >
        Open in Cursor
        <kbd className="settings-shortcut">⌘E</kbd>
      </button>
      <button
        type="button"
        role="menuitem"
        className="context-item"
        aria-keyshortcuts="Meta+U Control+U"
        onClick={() => {
          onToggleUnread(session.id);
          onDismiss();
        }}
      >
        {unread ? "Mark as Read" : "Mark as Unread"}
        <kbd className="settings-shortcut">⌘U</kbd>
      </button>
      <button
        type="button"
        role="menuitem"
        className="context-item"
        aria-keyshortcuts="Meta+T Control+T"
        onClick={() => {
          onNewTerminal(session.id);
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
        disabled={forkDisabled}
        aria-keyshortcuts="Meta+Y Control+Y"
        onClick={() => {
          if (forkDisabled) return;
          onFork(session.id);
          onDismiss();
        }}
      >
        Fork
        <kbd className="settings-shortcut">⌘Y</kbd>
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
      <div className="context-separator" role="separator" />
      <button
        type="button"
        role="menuitem"
        className="context-item"
        disabled={stopDisabled}
        aria-keyshortcuts="Control+C"
        onClick={() => {
          if (stopDisabled) return;
          onStop(session.id);
          onDismiss();
        }}
      >
        Stop
        <kbd className="settings-shortcut">⌃C</kbd>
      </button>
      <button
        type="button"
        role="menuitem"
        className="context-item"
        aria-keyshortcuts="Meta+W Control+W"
        onClick={() => {
          onClose(session.id);
          onDismiss();
        }}
      >
        Close
        <kbd className="settings-shortcut">⌘W</kbd>
      </button>
    </div>
  );
}
