import type { SwitchboardTurn, Session } from "../../../shared/types";
import { SwitchboardTurnCard } from "./SwitchboardTurnCard";

interface Props {
  turns: SwitchboardTurn[];
  sessions: Session[];
  isExpanded: (turnId: string) => boolean;
  onToggle: (turnId: string) => void;
  onClick: (sessionId: string, turnId: string, eventId: string) => void;
}

export function SwitchboardFeed({ turns, sessions, isExpanded, onToggle, onClick }: Props) {
  const titleFor = (turn: SwitchboardTurn) =>
    sessions.find((session) => session.id === turn.sessionId)?.title ?? turn.sessionTitle ?? "Closed session";

  if (turns.length === 0) {
    return (
      <div className="empty">
        Create a session with the plus (+) button on the top left hand corner.
      </div>
    );
  }

  const ordered = [...turns].sort((a, b) => a.at - b.at);

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
            expanded={isExpanded(turn.id)}
            onToggle={onToggle}
            onOpen={onClick}
          />
        );
      })}
    </div>
  );
}
