import type {
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { SessionRailLabel } from "./SessionRailLabel";
import { SessionRailPinButton } from "./SessionRailPinButton";
import { SessionRailRename } from "./SessionRailRename";
import { requestPromptFocus } from "../shortcuts/paneFocus";
import type { RenameTarget } from "./renameTarget";
import "./sessionRailChevron.css";

type Props = {
  session: Session;
  isPinned: boolean;
  active: boolean;
  canPin: boolean;
  unread: boolean;
  renaming: boolean;
  dropParent: boolean;
  setRename: (target: RenameTarget | null) => void;
  onSelect: (id: ActiveTabId) => void;
  onToggleExpanded: (sessionId: string, expanded: boolean) => void;
  onRenameSession: (id: string, title: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onOpenSessionMenu: (event: ReactMouseEvent, session: Session, pinned: boolean) => void;
  onDragOver: (event: ReactDragEvent) => void;
  onDrop: (event: ReactDragEvent) => void;
};

/** Parent chat row in the session rail (or its inline rename field). */
export function SessionRailParentRow({
  session,
  isPinned,
  active,
  canPin,
  unread,
  renaming,
  dropParent,
  setRename,
  onSelect,
  onToggleExpanded,
  onRenameSession,
  onPin,
  onUnpin,
  onOpenSessionMenu,
  onDragOver,
  onDrop,
}: Props) {
  const hasChildren = session.tabs.length > 0;
  const chevron = hasChildren ? (
    <span
      className={`rail-chevron ${session.tabsExpanded ? "expanded" : ""}`}
      role="button"
      tabIndex={-1}
      aria-label={session.tabsExpanded ? "Collapse" : "Expand"}
      onMouseDown={(event) => {
        // Keep focus from leaving the rename field via mousedown blur.
        if (renaming) event.preventDefault();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onToggleExpanded(session.id, !session.tabsExpanded);
      }}
    />
  ) : (
    <span className="rail-chevron-spacer" aria-hidden="true" />
  );

  if (renaming) {
    return (
      <SessionRailRename
        title={session.title}
        leading={chevron}
        onSave={(title) => {
          onRenameSession(session.id, title);
          setRename(null);
          requestPromptFocus();
        }}
        onCancel={() => setRename(null)}
      />
    );
  }

  return (
    <button
      type="button"
      className={`rail-session ${active ? "active" : ""} ${session.status === "connecting" ? "creating" : ""} ${dropParent ? "rail-drop-parent" : ""}`}
      data-tooltip={`${session.title}\n${session.cwd}`}
      data-tooltip-side="right"
      onClick={() => onSelect(session.id)}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest(".rail-pin-btn, .rail-chevron")) return;
        event.preventDefault();
        setRename({ kind: "session", session });
      }}
      onContextMenu={(e) => onOpenSessionMenu(e, session, isPinned)}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {chevron}
      <SessionRailLabel title={session.title} />
      {(session.status === "running" || unread || isPinned || canPin) && (
        <span className="rail-session-end">
          {session.status === "running" ? (
            <span className="rail-spinner" role="status" aria-label="Agent thinking" />
          ) : unread ? (
            <span className="rail-unread" role="status" aria-label="Unread" />
          ) : null}
          {(isPinned || canPin) && (
            <SessionRailPinButton
              pinned={isPinned}
              onToggle={() => (isPinned ? onUnpin(session.id) : onPin(session.id))}
            />
          )}
        </span>
      )}
    </button>
  );
}
