import type { RefObject } from "react";
import type { SessionTab } from "../../../shared/session";
import "../settings/menus.css";
import "../settings/settingsShortcuts.css";
import { SessionRailMenuItem } from "./SessionRailMenuItem";

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
      <SessionRailMenuItem
        label="Rename..."
        shortcut="⌘R"
        keys="Meta+R Control+R"
        onSelect={() => onRename(tab)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label="New Terminal"
        shortcut="⌘T"
        keys="Meta+T Control+T"
        onSelect={() => onNewTerminal(sessionId)}
        onDismiss={onDismiss}
      />
      <SessionRailMenuItem
        label="Close"
        shortcut="⌘W"
        keys="Meta+W Control+W"
        onSelect={() => onClose(tab.tabId)}
        onDismiss={onDismiss}
      />
    </div>
  );
}
