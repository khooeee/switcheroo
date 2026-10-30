import { useMemo } from "react";
import type { Session } from "../../../shared/session";
import type { SwitchboardTurn } from "../../../shared/switchboardTurn";
import { SwitchboardTurnCard } from "./SwitchboardTurnCard";
import { switchboardTurnTitle } from "./switchboardTurnTitle";

interface Props {
  turns: SwitchboardTurn[];
  sessions: Session[];
  onOpenRightRail: (turnId: string, focusEventId?: string) => void;
  onClick: (sessionId: string, turnId: string, eventId: string) => void;
}

export function SwitchboardFeed({
  turns,
  sessions,
  onOpenRightRail,
  onClick,
}: Props) {
  const ordered = useMemo(
    () => [...turns].sort((a, b) => a.at - b.at),
    [turns],
  );

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
            title={switchboardTurnTitle(turn, session)}
            session={session}
            onOpenRightRail={onOpenRightRail}
            onOpen={onClick}
          />
        );
      })}
    </div>
  );
}
