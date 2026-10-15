import { memo, useMemo } from "react";
import type { TranscriptTurn } from "../../../shared/transcript";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { TranscriptMessage } from "./TranscriptMessage";
import { TurnEvents } from "./TurnEvents";
import { SubagentChips } from "../subagents/SubagentChips";
import { subagentRows } from "../subagents/subagentRows";
import { turnImages } from "../images/turnImages";
import type { MessageSession } from "./useMessageSession";
import { useTurnRailOpeners } from "./useTurnRailOpeners";

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
  const { openUser, openLatest, openAssistant } = useTurnRailOpeners(turn, onOpenRightRail);
  // Steers land as user events; keep them visible in the main feed.
  const steerEvents = useMemo(
    () => turn.events.filter((event) => event.role === "user"),
    [turn.events],
  );
  const subagents = useMemo(() => subagentRows(turn.events), [turn.events]);
  // The agent's reply often refers to an image a tool returned; show it with the reply.
  const images = useMemo(() => turnImages(turn.events), [turn.events]);

  return (
    <div className="session-turn" data-turn-id={turn.id}>
      <TranscriptMessage
        session={session}
        item={turn.user}
        onToggleDetails={openUser}
        forkable
      />
      <TurnEvents session={session} events={steerEvents} />
      <SubagentChips sessionId={session.id} rows={subagents} />
      {running ? <ThinkingIndicator onActivate={openLatest} /> : null}
      {!running && turn.assistant ? (
        <TranscriptMessage
          session={session}
          item={turn.assistant}
          onToggleDetails={openAssistant}
          extraFileChanges={turn.fileChanges}
          extraImages={images}
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
