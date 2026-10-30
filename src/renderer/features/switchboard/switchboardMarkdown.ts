import type { Session } from "../../../shared/session";
import type { SwitchboardTurn } from "../../../shared/switchboardTurn";
import { turnMarkdown } from "../copy/turnMarkdown";
import { firstLine } from "../sessions/firstLine";
import { switchboardTurnTitle } from "./switchboardTurnTitle";

/** The Switchboard feed (oldest first) as one markdown document; each turn is led by its session title. */
export function switchboardMarkdown(turns: SwitchboardTurn[], sessions: Session[]): string {
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));
  const body = [...turns]
    .sort((a, b) => a.at - b.at)
    .map((turn) => {
      const title = firstLine(switchboardTurnTitle(turn, sessionsById.get(turn.sessionId)));
      return `**${title}**\n\n${turnMarkdown(turn, { agent: turn.agent })}`;
    })
    .join("\n\n---\n\n");
  return `# Switchboard\n\n${body}\n`;
}
