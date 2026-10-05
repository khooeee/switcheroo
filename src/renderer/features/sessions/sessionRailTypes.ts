import type { Session, SessionTab } from "../../../shared/types";

export type RenameTarget =
  | { kind: "session"; session: Session }
  | { kind: "tab"; tab: SessionTab };

export type MenuState =
  | { kind: "session"; session: Session; pinned: boolean; x: number; y: number }
  | { kind: "tab"; tab: SessionTab; sessionId: string; x: number; y: number };
