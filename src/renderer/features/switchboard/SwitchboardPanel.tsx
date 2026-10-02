import type { RefObject } from "react";
import type { SwitchboardTurn, Session } from "../../../shared/types";
import { SwitchboardFeed } from "./SwitchboardFeed";
import { SwitchboardNotice } from "./SwitchboardNotice";

interface Props {
  turns: SwitchboardTurn[];
  sessions: Session[];
  notice: string | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  onNoticeDismiss: () => void;
  onTurnClick: (sessionId: string, turnId: string, eventId: string) => void;
  onOpenRightRail: (turnId: string, focusEventId?: string) => void;
}

/** Switchboard panel: header, optional missing-session notice, and feed. */
export function SwitchboardPanel({
  turns,
  sessions,
  notice,
  scrollRef,
  onNoticeDismiss,
  onTurnClick,
  onOpenRightRail,
}: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Switchboard</h2>
      </div>
      {notice && <SwitchboardNotice message={notice} onDismiss={onNoticeDismiss} />}
      <div className="scroll" ref={scrollRef}>
        <SwitchboardFeed
          turns={turns}
          sessions={sessions}
          scrollRef={scrollRef}
          onOpenRightRail={onOpenRightRail}
          onClick={onTurnClick}
        />
      </div>
    </section>
  );
}
