import type { Session } from "../../../shared/session";
import { firstLine } from "./firstLine";
import { sessionMarkdown } from "./sessionMarkdown";

/** Loads a session's transcript and opens a save dialog for it as markdown. */
export async function saveSessionMarkdown(session: Session): Promise<void> {
  const turns = await window.switcheroo.getTranscript(session.id);
  await window.switcheroo.saveMarkdown(sessionMarkdown(session, turns), firstLine(session.title));
}
