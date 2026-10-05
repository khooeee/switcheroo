import type { Session } from "../shared/session";
import type { SessionMeta } from "./sessionMeta";

export function metaFromSession(session: Session): SessionMeta {
  return {
    title: session.title,
    agent: session.agent,
    cwd: session.cwd,
    agentSessionId: session.agentSessionId,
    usage: session.usage,
    tabs: session.tabs,
    tabsExpanded: session.tabsExpanded,
  };
}
