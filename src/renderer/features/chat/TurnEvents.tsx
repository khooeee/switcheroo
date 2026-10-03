import { memo, useCallback } from "react";
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
        <TurnEventMessage
          key={item.id}
          session={session}
          item={item}
          onActivate={onActivate}
        />
      ))}
    </div>
  );
});

/** Binds event id without an inline closure so TranscriptMessage memo stays stable. */
const TurnEventMessage = memo(function TurnEventMessage({
  session,
  item,
  onActivate,
}: {
  session: Session;
  item: TranscriptItem;
  onActivate?: (eventId: string) => void;
}) {
  const handleActivate = useCallback(
    () => onActivate?.(item.id),
    [onActivate, item.id],
  );
  return (
    <TranscriptMessage
      session={session}
      item={item}
      onActivate={onActivate ? handleActivate : undefined}
    />
  );
});
