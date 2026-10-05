import type {
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import type { ActiveTabId, SessionTab } from "../../../shared/types";
import { SessionRailLabel } from "./SessionRailLabel";
import { SessionRailRename } from "./SessionRailRename";
import type { RenameTarget } from "./sessionRailTypes";

type Props = {
  tab: SessionTab;
  sessionId: string;
  active: boolean;
  dragging: boolean;
  dropLineBefore: boolean;
  dropLineAfter: boolean;
  renaming: boolean;
  setRename: (target: RenameTarget | null) => void;
  onSelect: (id: ActiveTabId) => void;
  onRenameTab: (tabId: string, title: string) => void;
  onOpenTabMenu: (event: ReactMouseEvent, tab: SessionTab, sessionId: string) => void;
  onChildDragStart: (event: ReactDragEvent, tabId: string) => void;
  onDragOver: (event: ReactDragEvent) => void;
  onDrop: (event: ReactDragEvent) => void;
};

/** Child terminal tab row (or its inline rename field). */
export function SessionRailChildTab({
  tab,
  sessionId,
  active,
  dragging,
  dropLineBefore,
  dropLineAfter,
  renaming,
  setRename,
  onSelect,
  onRenameTab,
  onOpenTabMenu,
  onChildDragStart,
  onDragOver,
  onDrop,
}: Props) {
  if (renaming) {
    return (
      <SessionRailRename
        title={tab.title}
        child
        onSave={(title) => {
          onRenameTab(tab.tabId, title);
          setRename(null);
        }}
        onCancel={() => setRename(null)}
      />
    );
  }

  return (
    <button
      type="button"
      draggable
      className={[
        "rail-session",
        "rail-child",
        active ? "active" : "",
        dragging ? "dragging" : "",
        dropLineBefore ? "drop-line-before" : "",
        dropLineAfter ? "drop-line-after" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-tooltip={tab.title}
      data-tooltip-side="right"
      onClick={() => onSelect(tab.tabId)}
      onDoubleClick={(event) => {
        event.preventDefault();
        setRename({ kind: "tab", tab });
      }}
      onContextMenu={(e) => onOpenTabMenu(e, tab, sessionId)}
      onDragStart={(e) => onChildDragStart(e, tab.tabId)}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <SessionRailLabel title={tab.title} />
    </button>
  );
}
