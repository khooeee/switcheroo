import type { ActiveTabId } from "../../shared/activeTabId";
import type { Session } from "../../shared/session";

/** Snapshot of session state the Session menu items depend on. */
export type MenuCtx = {
  activeTabId: ActiveTabId;
  sessions: Map<string, Session>;
  pinnedIds: string[];
  supportsFork: (agent: Session["agent"]) => boolean;
};
