import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import { turnsMarkdown } from "../copy/turnsMarkdown";
import { firstLine } from "./firstLine";

/** A session's transcript as one markdown document under its title. */
export function sessionMarkdown(session: Session, turns: TranscriptTurn[]): string {
  return turnsMarkdown(turns, { agent: session.agent, title: firstLine(session.title) });
}
