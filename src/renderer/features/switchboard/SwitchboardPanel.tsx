import type { RefObject } from "react";
import type { SwitchboardEvent, Session } from "../../../shared/types";
import { ThinkingIndicator } from "../chat/ThinkingIndicator";
import { SwitchboardFeed } from "./SwitchboardFeed";
import { SwitchboardNotice } from "./SwitchboardNotice";

interface Props {
  events: SwitchboardEvent[];
  sessions: Session[];
  notice: string | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  onNoticeDismiss: () => void;
  onEventClick: (event: SwitchboardEvent) => void;
}

/** Switchboard panel: header, optional missing-session notice, and feed. */
export function SwitchboardPanel({
  events,
  sessions,
  notice,
  scrollRef,
  onNoticeDismiss,
  onEventClick,
}: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Switchboard</h2>
      </div>
      {notice && <SwitchboardNotice message={notice} onDismiss={onNoticeDismiss} />}
      <div className="scroll" ref={scrollRef}>
        <SwitchboardFeed events={events} sessions={sessions} onClick={onEventClick} />
        {sessions.some((session) => session.status === "running") && <ThinkingIndicator />}
      </div>
    </section>
  );
}
