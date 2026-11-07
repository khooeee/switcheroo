import type { Session } from "../../shared/session";

/** Snapshot of session state the Session menu items depend on. */
export type MenuCtx = {
  activeSession: Session | null;
  pinnedIds: string[];
  supportsFork: (agent: Session["agent"]) => boolean;
};
