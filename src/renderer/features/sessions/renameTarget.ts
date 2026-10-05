import type { Session, SessionTab } from "../../../shared/session";

/** Rail row (session or child tab) currently being renamed inline. */
export type RenameTarget =
  | { kind: "session"; session: Session }
  | { kind: "tab"; tab: SessionTab };
