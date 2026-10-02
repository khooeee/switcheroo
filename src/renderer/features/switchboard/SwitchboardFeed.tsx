import type { RefObject } from "react";
import { useCallback, useMemo } from "react";
import type { SwitchboardTurn, Session } from "../../../shared/types";
import { railArgsForFeedEvent } from "../chat/railArgsForFeedEvent";
import { selectableFeedEventIds } from "../chat/selectableFeedEventIds";
import { useFeedMessageNav } from "../chat/useFeedMessageNav";
import { SwitchboardTurnCard } from "./SwitchboardTurnCard";

interface Props {
  turns: SwitchboardTurn[];
  sessions: Session[];
  scrollRef: RefObject<HTMLDivElement | null>;
  onOpenRightRail: (turnId: string, focusEventId?: string) => void;
  onForceOpenRightRail: (turnId: string, focusEventId?: string, takeFocus?: boolean) => void;
  onClick: (sessionId: string, turnId: string, eventId: string) => void;
}

export function SwitchboardFeed({
  turns,
  sessions,
  scrollRef,
  onOpenRightRail,
  onForceOpenRightRail,
  onClick,
}: Props) {
  const ordered = useMemo(
    () => [...turns].sort((a, b) => a.at - b.at),
    [turns],
  );
  const eventIds = useMemo(() => selectableFeedEventIds(ordered), [ordered]);
  const activateSelected = useCallback(
    (eventId: string) => {
      const args = railArgsForFeedEvent(ordered, eventId);
      if (!args) return;
      onOpenRightRail(args.turnId, args.focusEventId);
    },
    [ordered, onOpenRightRail],
  );
  const openDetailsSelected = useCallback(
    (eventId: string) => {
      const args = railArgsForFeedEvent(ordered, eventId);
      if (!args) return;
      onForceOpenRightRail(args.turnId, args.focusEventId, true);
    },
    [ordered, onForceOpenRightRail],
  );
  const enterSelected = useCallback(
    (eventId: string) => {
      const turn = ordered.find(
        (entry) => entry.user.id === eventId || entry.assistant?.id === eventId,
      );
      if (!turn?.navigable) return;
      onClick(turn.sessionId, turn.id, eventId);
    },
    [ordered, onClick],
  );
  const { selectedEventId, selectMessage } = useFeedMessageNav(
    eventIds,
    scrollRef,
    "switchboard",
    activateSelected,
    enterSelected,
    openDetailsSelected,
  );

  const titleFor = (turn: SwitchboardTurn) =>
    sessions.find((session) => session.id === turn.sessionId)?.title ?? turn.sessionTitle ?? "Closed session";

  if (turns.length === 0) {
    return (
      <div className="empty">
        Create a session with the plus (+) button on the top left hand corner.
      </div>
    );
  }

  return (
    <div className="feed">
      {ordered.map((turn) => {
        const session = sessions.find((entry) => entry.id === turn.sessionId);
        return (
          <SwitchboardTurnCard
            key={turn.id}
            turn={turn}
            title={titleFor(turn)}
            cwd={session?.cwd}
            session={session}
            selectedEventId={selectedEventId}
            onSelectMessage={selectMessage}
            onOpenRightRail={onOpenRightRail}
            onOpen={onClick}
          />
        );
      })}
    </div>
  );
}
