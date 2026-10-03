import { memo } from "react";
import type { Session, TranscriptTurn } from "../../../shared/types";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { TranscriptMessage } from "./TranscriptMessage";
import { TurnEvents } from "./TurnEvents";

/** Full turn body for the right rail: user → events → assistant (no expand/collapse). */
export const TurnDetail = memo(function TurnDetail({
  session,
  turn,
  onEventActivate,
}: {
  session: Session;
  turn: TranscriptTurn;
  onEventActivate?: (eventId: string) => void;
}) {
  const running = turn.status === "running" && !turn.user.queued;

  return (
    <div className="session-turn" data-turn-id={turn.id}>
      <TranscriptMessage session={session} item={turn.user} forkable />
      <TurnEvents
        session={session}
        events={turn.events}
        onActivate={onEventActivate}
      />
      {running && turn.assistant ? (
        <TranscriptMessage session={session} item={turn.assistant} />
      ) : null}
      {running ? <ThinkingIndicator /> : null}
      {!running && turn.assistant ? (
        <TranscriptMessage
          session={session}
          item={turn.assistant}
          extraFileChanges={turn.fileChanges}
          forkable
        />
      ) : null}
      {!running && !turn.assistant && turn.status === "stopped" ? (
        <div className="message stopped" data-event-id={`${turn.id}-stopped`}>
          <div className="body">Stopped</div>
        </div>
      ) : null}
    </div>
  );
});
