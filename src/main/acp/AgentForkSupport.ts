import type { AgentKind, Session } from "../../shared/types";
import { AGENT_PRESETS } from "./presets";

type ForkFlags = Required<Pick<Session, "supportsFork" | "supportsForkAtMessage">>;

/**
 * What each agent kind advertised for `session/fork` in ACP initialize. An
 * adapter answers the same for every session, so one connection covers the kind.
 */
export class AgentForkSupport {
  private advertised = new Map<AgentKind, boolean>();

  /** Returns true when the answer changed. */
  record(agent: AgentKind, supported: boolean): boolean {
    if (this.advertised.get(agent) === supported) return false;
    this.advertised.set(agent, supported);
    return true;
  }

  /** Unknown until an agent of this kind connects; allow it so the agent's own error shows. */
  flags(agent: AgentKind): ForkFlags {
    const supportsFork = this.advertised.get(agent) ?? true;
    return {
      supportsFork,
      supportsForkAtMessage: supportsFork && AGENT_PRESETS[agent].forksAtMessage === true,
    };
  }
}
