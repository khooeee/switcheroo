import type { Session } from "../../../shared/session";

/** Open rail context menu: which session it belongs to and where it was opened. */
export type MenuState = { session: Session; pinned: boolean; x: number; y: number };
