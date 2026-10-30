import type { Session } from "../../../shared/session";
import type { SwitchboardTurn } from "../../../shared/switchboardTurn";
import { turnMarkdown } from "../copy/turnMarkdown";
import { firstLine } from "../sessions/firstLine";

/** The Switchboard feed (oldest first) as one markdown document; each turn is led by its session title. */
export function switchboardMarkdown(turns: SwitchboardTurn[], sessions: Session[]): string {
  const body = [...turns]
    .sort((a, b) => a.at - b.at)
    .map((turn) => {
      const session = sessions.find((entry) => entry.id === turn.sessionId);
      const title = firstLine(session?.title ?? turn.sessionTitle ?? "Closed session");
      return `**${title}**\n\n${turnMarkdown(turn, { agent: turn.agent })}`;
    })
    .join("\n\n---\n\n");
  return `# Switchboard\n\n${body}\n`;
}
