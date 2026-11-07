import type { Session } from "../../shared/session";
import type { TranscriptTurn } from "../../shared/transcript";
import type { ActivityEntry } from "./ActivityEntry";

const MAX_TEXT_LENGTH = 4000;

function clip(text: string): string {
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;
}

/** Slim log entry for a finished turn. */
export function activityFromTurn(session: Session, turn: TranscriptTurn): ActivityEntry {
  const steers = turn.events.filter((event) => event.role === "user");
  return {
    at: Date.now(),
    sessionId: session.id,
    turnId: turn.id,
    title: session.title,
    cwd: session.cwd,
    agent: session.agent,
    status: turn.status,
    prompt: clip([turn.user, ...steers].map((item) => item.text).join("\n\n")),
    reply: clip(turn.assistant?.text ?? ""),
    files: [...new Set(turn.fileChanges.map((change) => change.path))],
    cron: session.cron === true,
  };
}
