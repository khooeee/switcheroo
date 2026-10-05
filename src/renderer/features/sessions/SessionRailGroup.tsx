import type {
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import type { ActiveTabId, Session, SessionTab } from "../../../shared/types";
import { visibleChildren } from "../../../shared/tabNav";
import { SessionRailChildTab } from "./SessionRailChildTab";
import { SessionRailParentRow } from "./SessionRailParentRow";
import type { RenameTarget } from "./sessionRailTypes";
import type { TabDropTarget } from "./tabDropTarget";

/** One chat parent row plus its visible child terminal tabs. */
export function SessionRailGroup({
  session,
  isPinned,
  activeTabId,
  filter,
  canPin,
  unread,
  dragTabId,
  dropTarget,
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
  onDropTarget,
}: {
  session: Session;
  isPinned: boolean;
  activeTabId: ActiveTabId;
  filter: string;
  canPin: boolean;
  unread: boolean;
  dragTabId: string | null;
  dropTarget: TabDropTarget | null;
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
  onDropTarget: (target: TabDropTarget | null) => void;
}) {
  const children = visibleChildren(session, filter);
  const renamingParent = rename?.kind === "session" && rename.session.id === session.id;
  const dropParent =
    dropTarget?.mode === "parent" && dropTarget.sessionId === session.id;
  const insertIndex =
    dropTarget?.mode === "insert" && dropTarget.sessionId === session.id
      ? dropTarget.index
      : null;

  return (
    <div
      className="rail-group"
      onDragOver={(e) => {
        if (!dragTabId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (e.target === e.currentTarget) {
          onDropTarget({
            sessionId: session.id,
            mode: "insert",
            index: children.length,
          });
        }
      }}
      onDrop={(e) => onGroupDrop(e, session.id)}
    >
      <SessionRailParentRow
        session={session}
        isPinned={isPinned}
        active={activeTabId === session.id}
        canPin={canPin}
        unread={unread}
        renaming={renamingParent}
        dropParent={dropParent}
        setRename={setRename}
        onSelect={onSelect}
        onToggleExpanded={onToggleExpanded}
        onRenameSession={onRenameSession}
        onPin={onPin}
        onUnpin={onUnpin}
        onOpenSessionMenu={onOpenSessionMenu}
        onDragOver={(e) => {
          if (!dragTabId) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          onDropTarget({ sessionId: session.id, mode: "parent" });
        }}
        onDrop={(e) => {
          e.stopPropagation();
          onGroupDrop(e, session.id);
        }}
      />
      {children.map((tab, index) => (
        <SessionRailChildTab
          key={tab.tabId}
          tab={tab}
          sessionId={session.id}
          active={activeTabId === tab.tabId}
          dragging={dragTabId === tab.tabId}
          dropLineBefore={insertIndex === index}
          dropLineAfter={insertIndex === children.length && index === children.length - 1}
          renaming={rename?.kind === "tab" && rename.tab.tabId === tab.tabId}
          setRename={setRename}
          onSelect={onSelect}
          onRenameTab={onRenameTab}
          onOpenTabMenu={onOpenTabMenu}
          onChildDragStart={onChildDragStart}
          onDragOver={(e) => {
            if (!dragTabId) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            const rect = e.currentTarget.getBoundingClientRect();
            const before = e.clientY < rect.top + rect.height / 2;
            onDropTarget({
              sessionId: session.id,
              mode: "insert",
              index: before ? index : index + 1,
            });
          }}
          onDrop={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const before = e.clientY < rect.top + rect.height / 2;
            onChildDrop(e, session.id, before ? index : index + 1);
          }}
        />
      ))}
    </div>
  );
}
