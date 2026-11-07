import { memo } from "react";
import type { TranscriptItem } from "../../../shared/transcript";
import { TranscriptMessage } from "./TranscriptMessage";
import type { MessageSession } from "./useMessageSession";

export const TurnEvents = memo(function TurnEvents({
  session,
  events,
}: {
  session: MessageSession;
  events: TranscriptItem[];
}) {
  if (events.length === 0) return null;
  return (
    <div className="turn-events">
      {events.map((item) => (
        <TranscriptMessage key={item.id} session={session} item={item} />
      ))}
    </div>
  );
});
