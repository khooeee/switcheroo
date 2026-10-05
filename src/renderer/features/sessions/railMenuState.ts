import type { Session, SessionTab } from "../../../shared/session";

/** Open rail context menu: which row it belongs to and where it was opened. */
export type MenuState =
  | { kind: "session"; session: Session; pinned: boolean; x: number; y: number }
  | { kind: "tab"; tab: SessionTab; sessionId: string; x: number; y: number };
