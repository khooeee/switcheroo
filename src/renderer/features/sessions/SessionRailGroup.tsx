import type {
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import type { ActiveTabId, Session, SessionTab } from "../../../shared/types";
import { visibleChildren } from "../../../shared/tabNav";
import { SessionRailLabel } from "./SessionRailLabel";
import { SessionRailPinButton } from "./SessionRailPinButton";
import { SessionRailRename } from "./SessionRailRename";
import { requestPromptFocus } from "../shortcuts/paneFocus";

type RenameTarget =
  | { kind: "session"; session: Session }
  | { kind: "tab"; tab: SessionTab };

/** One chat parent row plus its visible child terminal tabs. */
export function SessionRailGroup({
  session,
  isPinned,
  activeTabId,
  filter,
  canPin,
  unread,
  dragTabId,
  rename,
  setRename,
  onSelect,
  onToggleExpanded,
  onRenameSession,
  onRenameTab,
  onPin,
  onUnpin,
  onOpenSessionMenu,
  onOpenTabMenu,
  onChildDragStart,
  onChildDrop,
  onGroupDrop,
}: {
  session: Session;
  isPinned: boolean;
  activeTabId: ActiveTabId;
  filter: string;
  canPin: boolean;
  unread: boolean;
  dragTabId: string | null;
  rename: RenameTarget | null;
  setRename: (target: RenameTarget | null) => void;
  onSelect: (id: ActiveTabId) => void;
  onToggleExpanded: (sessionId: string, expanded: boolean) => void;
  onRenameSession: (id: string, title: string) => void;
  onRenameTab: (tabId: string, title: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onOpenSessionMenu: (event: ReactMouseEvent, session: Session, pinned: boolean) => void;
  onOpenTabMenu: (event: ReactMouseEvent, tab: SessionTab, sessionId: string) => void;
  onChildDragStart: (event: ReactDragEvent, tabId: string) => void;
  onChildDrop: (event: ReactDragEvent, toSessionId: string, toIndex: number) => void;
  onGroupDrop: (event: ReactDragEvent, toSessionId: string) => void;
}) {
  const children = visibleChildren(session, filter);
  const hasChildren = session.tabs.length > 0;
  const renamingParent = rename?.kind === "session" && rename.session.id === session.id;

  return (
    <div
      className="rail-group"
      onDragOver={(e) => {
        if (!dragTabId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => onGroupDrop(e, session.id)}
    >
      {renamingParent ? (
        <SessionRailRename
          title={session.title}
          onSave={(title) => {
            onRenameSession(session.id, title);
            setRename(null);
            requestPromptFocus();
          }}
          onCancel={() => setRename(null)}
        />
      ) : (
        <button
          type="button"
          className={`rail-session ${activeTabId === session.id ? "active" : ""} ${session.status === "connecting" ? "creating" : ""}`}
          data-tooltip={`${session.title}\n${session.cwd}\n(${session.status === "connecting" ? "Creating" : session.status})`}
          data-tooltip-side="right"
          onClick={() => onSelect(session.id)}
          onDoubleClick={(event) => {
            if ((event.target as HTMLElement).closest(".rail-pin-btn, .rail-chevron")) return;
            event.preventDefault();
            setRename({ kind: "session", session });
          }}
          onContextMenu={(e) => onOpenSessionMenu(e, session, isPinned)}
        >
          {hasChildren ? (
            <span
              className={`rail-chevron ${session.tabsExpanded ? "expanded" : ""}`}
              role="button"
              tabIndex={-1}
              aria-label={session.tabsExpanded ? "Collapse" : "Expand"}
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpanded(session.id, !session.tabsExpanded);
              }}
            />
          ) : (
            <span className="rail-chevron-spacer" aria-hidden="true" />
          )}
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
      )}
      {children.map((tab, index) =>
        rename?.kind === "tab" && rename.tab.tabId === tab.tabId ? (
          <SessionRailRename
            key={tab.tabId}
            title={tab.title}
            child
            onSave={(title) => {
              onRenameTab(tab.tabId, title);
              setRename(null);
            }}
            onCancel={() => setRename(null)}
          />
        ) : (
          <button
            key={tab.tabId}
            type="button"
            draggable
            className={`rail-session rail-child ${activeTabId === tab.tabId ? "active" : ""} ${dragTabId === tab.tabId ? "dragging" : ""}`}
            data-tooltip={tab.title}
            data-tooltip-side="right"
            onClick={() => onSelect(tab.tabId)}
            onDoubleClick={(event) => {
              event.preventDefault();
              setRename({ kind: "tab", tab });
            }}
            onContextMenu={(e) => onOpenTabMenu(e, tab, session.id)}
            onDragStart={(e) => onChildDragStart(e, tab.tabId)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => onChildDrop(e, session.id, index)}
          >
            <SessionRailLabel title={tab.title} />
          </button>
        ),
      )}
    </div>
  );
}
