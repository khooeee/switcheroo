import { memo, useCallback, useMemo } from "react";
import type { TranscriptTurn } from "../../../shared/transcript";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { TranscriptMessage } from "./TranscriptMessage";
import { TurnEvents } from "./TurnEvents";
import { SubagentChips } from "../subagents/SubagentChips";
import { subagentRows } from "../subagents/subagentRows";
import type { MessageSession } from "./useMessageSession";

/** Compact session turn: user + steers + subagents + assistant. Other mid-turn events live in the right rail. */
export const SessionTurn = memo(function SessionTurn({
  session,
  turn,
  onOpenRightRail,
}: {
  session: MessageSession;
  turn: TranscriptTurn;
  onOpenRightRail: (turnId: string, focusEventId?: string) => void;
}) {
  const running = turn.status === "running" && !turn.user.queued;
  const openRail = useCallback(
    (eventId: string) => onOpenRightRail(turn.id, eventId),
    [onOpenRightRail, turn.id],
  );
  const handleOpenUser = useCallback(() => openRail(turn.user.id), [openRail, turn.user.id]);
  const handleOpenAssistant = useCallback(() => {
    if (!turn.assistant) return;
    openRail(turn.assistant.id);
  }, [openRail, turn.assistant]);
  // Steers land as user events; keep them visible in the main feed.
  const steerEvents = useMemo(
    () => turn.events.filter((event) => event.role === "user"),
    [turn.events],
  );
  const subagents = useMemo(() => subagentRows(turn.events), [turn.events]);

  return (
    <div className="session-turn" data-turn-id={turn.id}>
      <TranscriptMessage
        session={session}
        item={turn.user}
        onToggleDetails={handleOpenUser}
        forkable
      />
      <TurnEvents session={session} events={steerEvents} />
      <SubagentChips sessionId={session.id} rows={subagents} />
      {running ? <ThinkingIndicator onActivate={handleOpenUser} /> : null}
      {!running && turn.assistant ? (
        <TranscriptMessage
          session={session}
          item={turn.assistant}
          onToggleDetails={handleOpenAssistant}
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
