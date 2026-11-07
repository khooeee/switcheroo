import type { MouseEvent as ReactMouseEvent } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { SessionRailLabel } from "./SessionRailLabel";
import { SessionRailPinButton } from "./SessionRailPinButton";
import { SessionRailRename } from "./SessionRailRename";
import { requestPromptFocus } from "../shortcuts/paneFocus";

type Props = {
  session: Session;
  isPinned: boolean;
  active: boolean;
  canPin: boolean;
  unread: boolean;
  renaming: boolean;
  setRename: (session: Session | null) => void;
  onSelect: (id: ActiveTabId) => void;
  onRenameSession: (id: string, title: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onOpenSessionMenu: (event: ReactMouseEvent, session: Session, pinned: boolean) => void;
};

/** Chat row in the session rail (or its inline rename field). */
export function SessionRailRow({
  session,
  isPinned,
  active,
  canPin,
  unread,
  renaming,
  setRename,
  onSelect,
  onRenameSession,
  onPin,
  onUnpin,
  onOpenSessionMenu,
}: Props) {
  if (renaming) {
    return (
      <SessionRailRename
        title={session.title}
        onSave={(title) => {
          onRenameSession(session.id, title);
          setRename(null);
          requestPromptFocus();
        }}
        onCancel={() => setRename(null)}
      />
    );
  }

  // A div, not a <button>: the row contains the pin button, and buttons cannot nest.
  return (
    <div
      role="button"
      tabIndex={0}
      className={`rail-session ${active ? "active" : ""} ${session.status === "connecting" ? "creating" : ""}`}
      data-tooltip={`${session.title}\n${session.cwd}`}
      data-tooltip-side="right"
      onClick={() => onSelect(session.id)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect(session.id);
      }}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest(".rail-pin-btn")) return;
        event.preventDefault();
        setRename(session);
      }}
      onContextMenu={(e) => onOpenSessionMenu(e, session, isPinned)}
    >
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
    </div>
  );
}
