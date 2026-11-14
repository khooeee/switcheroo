import type { RefObject } from "react";
import type { Session } from "../../../shared/session";
import { SAVE_MARKDOWN_VIEW_LABELS } from "../../../shared/saveMarkdownViewLabels";
import "../settings/menus.css";
import "../settings/settingsShortcuts.css";
import { openSessionInEditor } from "../explorer/openSessionInEditor";
import { modLabel } from "../shortcuts/modLabel";
import { SessionRailMenuItem } from "./SessionRailMenuItem";
import { saveSessionMarkdown } from "./saveSessionMarkdown";

export function SessionRailMenu({
  menuRef,
  session,
  pinned,
  unread,
  x,
  y,
  onRename,
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
  unread: boolean;
  x: number;
  y: number;
  onRename: (session: Session) => void;
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
        shortcut={modLabel("R")}
        keys="Meta+R Control+R"
        onSelect={() => onRename(session)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label="Open in Editor"
        disabled={!session.cwd.trim()}
        onSelect={() => void openSessionInEditor(session.id).catch(console.error)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label={unread ? "Mark as Read" : "Mark as Unread"}
        shortcut={modLabel("U")}
        keys="Meta+U Control+U"
        onSelect={() => onToggleUnread(session.id)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label="Fork"
        shortcut={modLabel("N", true)}
        keys="Meta+Shift+N Control+Shift+N"
        disabled={!session.supportsFork}
        onSelect={() => onFork(session.id)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label={pinned ? "Unpin" : "Pin"}
        shortcut={modLabel("P", true)}
        keys="Meta+Shift+P Control+Shift+P"
        onSelect={() => (pinned ? onUnpin(session.id) : onPin(session.id))}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label={`${SAVE_MARKDOWN_VIEW_LABELS.session}...`}
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
        shortcut={modLabel("W")}
        keys="Meta+W"
        onSelect={() => onClose(session.id)}
        onDismiss={onDismiss}
      />
    </div>
  );
}
