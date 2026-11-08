import type { Session } from "../../shared/session";
import { clipText } from "./clipText";

/** First non-empty title line (prefix + name), short enough to speak. */
export function sessionLabel(session: Session): string {
  const first = session.title.split("\n").find((line) => line.trim()) ?? "Untitled";
  return clipText(first, 80);
}
