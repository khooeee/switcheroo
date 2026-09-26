import type { RefObject } from "react";
import type { Session } from "../../../shared/types";

export function SessionRailMenu({
  menuRef,
  ids,
  x,
  y,
  sessions,
  onRename,
  onFork,
  onClose,
  onDismiss,
}: {
  menuRef: RefObject<HTMLDivElement | null>;
  ids: string[];
  x: number;
  y: number;
  sessions: Session[];
  onRename: (session: Session) => void;
  onFork: (id: string) => void;
  onClose: (ids: string[]) => void;
  onDismiss: () => void;
}) {
  const multi = ids.length > 1;
  return (
    <div ref={menuRef} className="context-menu" role="menu" style={{ left: x, top: y }}>
      {!multi && (
        <>
          <button
            type="button"
            role="menuitem"
            className="context-item"
            onClick={() => {
              const target = sessions.find((session) => session.id === ids[0]);
              if (target) onRename(target);
              onDismiss();
            }}
          >
            Rename...
          </button>
          <button
            type="button"
            role="menuitem"
            className="context-item"
            onClick={() => {
              const id = ids[0];
              if (id) onFork(id);
              onDismiss();
            }}
          >
            Fork
          </button>
        </>
      )}
      <button
        type="button"
        role="menuitem"
        className="context-item"
        onClick={() => {
          onClose(ids);
          onDismiss();
        }}
      >
        Close
      </button>
    </div>
  );
}
