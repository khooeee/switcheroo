import type { RefObject } from "react";
import type { Session } from "../../../shared/session";
import "../settings/menus.css";
import "../settings/settingsShortcuts.css";
import { SessionRailMenuItem } from "./SessionRailMenuItem";
import { saveSessionMarkdown } from "./saveSessionMarkdown";

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
  return (
    <div ref={menuRef} className="context-menu" role="menu" style={{ left: x, top: y }}>
      <SessionRailMenuItem
        label="Rename..."
        shortcut="⌘R"
        keys="Meta+R Control+R"
        onSelect={() => onRename(session)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label="Open in Cursor"
        shortcut="⌘E"
        keys="Meta+E Control+E"
        disabled={!session.cwd.trim()}
        onSelect={() => void window.switcheroo.openSessionInCursor(session.id).catch(console.error)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label={unread ? "Mark as Read" : "Mark as Unread"}
        shortcut="⌘U"
        keys="Meta+U Control+U"
        onSelect={() => onToggleUnread(session.id)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label="New Terminal"
        shortcut="⌘T"
        keys="Meta+T Control+T"
        onSelect={() => onNewTerminal(session.id)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label="Fork"
        shortcut="⌘Y"
        keys="Meta+Y Control+Y"
        disabled={!session.supportsFork}
        onSelect={() => onFork(session.id)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label={pinned ? "Unpin" : "Pin"}
        shortcut="⌘P"
        keys="Meta+P Control+P"
        disabled={!pinned && !canPin}
        onSelect={() => (pinned ? onUnpin(session.id) : onPin(session.id))}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label="Save Session as Markdown"
        onSelect={() => void saveSessionMarkdown(session).catch(console.error)}
        onDismiss={onDismiss}
      />
      <div className="context-separator" role="separator" />
      <SessionRailMenuItem
        label="Stop"
        shortcut="⌃C"
        keys="Control+C"
        disabled={session.status !== "running"}
        onSelect={() => onStop(session.id)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label="Close"
        shortcut="⌘W"
        keys="Meta+W"
        onSelect={() => onClose(session.id)}
        onDismiss={onDismiss}
      />
    </div>
  );
}
