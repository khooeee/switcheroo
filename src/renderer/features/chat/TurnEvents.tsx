import { memo, useCallback } from "react";
import type { Session, TranscriptItem } from "../../../shared/types";
import { TranscriptMessage } from "./TranscriptMessage";

export const TurnEvents = memo(function TurnEvents({
  session,
  events,
  selectedEventId,
  onSelect,
  onActivate,
}: {
  session: Session;
  events: TranscriptItem[];
  selectedEventId?: string | null;
  onSelect?: (eventId: string) => void;
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
          selected={selectedEventId === item.id}
          onSelect={onSelect}
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
  selected,
  onSelect,
  onActivate,
}: {
  session: Session;
  item: TranscriptItem;
  selected?: boolean;
  onSelect?: (eventId: string) => void;
  onActivate?: (eventId: string) => void;
}) {
  const handleActivate = useCallback(
    () => onActivate?.(item.id),
    [onActivate, item.id],
  );
  const handleSelect = useCallback(
    () => onSelect?.(item.id),
    [onSelect, item.id],
  );
  return (
    <TranscriptMessage
      session={session}
      item={item}
      selected={selected}
      onSelect={onSelect ? handleSelect : undefined}
      onActivate={onActivate ? handleActivate : undefined}
    />
  );
});
