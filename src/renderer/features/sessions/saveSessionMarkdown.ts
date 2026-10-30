import type { Session } from "../../../shared/session";
import { turnsMarkdown } from "../copy/turnsMarkdown";
import { firstLine } from "./firstLine";

/** Loads a session's transcript and opens a save dialog for it as markdown. */
export async function saveSessionMarkdown(session: Session): Promise<void> {
  const title = firstLine(session.title);
  const turns = await window.switcheroo.getTranscript(session.id);
  await window.switcheroo.saveMarkdown(turnsMarkdown(turns, { agent: session.agent, title }), title);
}
