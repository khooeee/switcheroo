import { memo } from "react";
import type { TranscriptTurn } from "../../../shared/transcript";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { TranscriptMessage } from "./TranscriptMessage";
import { TurnEvents } from "./TurnEvents";
import type { MessageSession } from "./useMessageSession";

/** Full turn body for the right rail: user → events → assistant (no expand/collapse). */
export const TurnDetail = memo(function TurnDetail({
  session,
  turn,
  userLabel,
  forkable = true,
}: {
  session: MessageSession;
  turn: TranscriptTurn;
  /** Pill text for the opening message (a subagent's comes from the agent, not the user). */
  userLabel?: string;
  /** Subagent transcripts are read-only. */
  forkable?: boolean;
}) {
  const running = turn.status === "running" && !turn.user.queued;

  return (
    <div className="session-turn" data-turn-id={turn.id}>
      <TranscriptMessage session={session} item={turn.user} label={userLabel} forkable={forkable} />
      <TurnEvents session={session} events={turn.events} />
      {running && turn.assistant ? (
        <TranscriptMessage session={session} item={turn.assistant} />
      ) : null}
      {running ? <ThinkingIndicator /> : null}
      {!running && turn.assistant ? (
        <TranscriptMessage
          session={session}
          item={turn.assistant}
          extraFileChanges={turn.fileChanges}
          forkable={forkable}
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
