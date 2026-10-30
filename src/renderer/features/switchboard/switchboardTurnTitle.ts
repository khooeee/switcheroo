import type { Session } from "../../../shared/session";
import type { SwitchboardTurn } from "../../../shared/switchboardTurn";

/** Title shown for a Switchboard turn: the live session's, else the one saved with the turn. */
export function switchboardTurnTitle(turn: SwitchboardTurn, session: Session | undefined): string {
  return session?.title ?? turn.sessionTitle ?? "Closed session";
}
