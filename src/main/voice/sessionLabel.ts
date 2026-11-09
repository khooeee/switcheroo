import type { Session } from "../../shared/session";
import { clipText } from "../../shared/clipText";

/** First two non-empty title lines (folder + name), short enough to speak. */
export function sessionLabel(session: Session): string {
  const lines = session.title.split("\n").filter((line) => line.trim()).slice(0, 2);
  return clipText(lines.join(", ") || "Untitled", 120);
}
