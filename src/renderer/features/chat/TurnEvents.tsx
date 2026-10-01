import { memo } from "react";
import type { Session, TranscriptItem } from "../../../shared/types";
import { TranscriptMessage } from "./TranscriptMessage";

export const TurnEvents = memo(function TurnEvents({
  session,
  events,
  onActivate,
}: {
  session: Session;
  events: TranscriptItem[];
  onActivate?: (eventId: string) => void;
}) {
  if (events.length === 0) return null;
  return (
    <div className="turn-events">
      {events.map((item) => (
        <TranscriptMessage
          key={item.id}
          session={session}
          item={item}
          onActivate={onActivate ? () => onActivate(item.id) : undefined}
        />
      ))}
    </div>
  );
});
