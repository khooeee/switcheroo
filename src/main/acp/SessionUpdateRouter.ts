import type * as acp from "@agentclientprotocol/sdk";
import type { AgentKind } from "../../shared/agentKind";
import type { SessionCallbacks } from "./SessionCallbacks";
import type { SessionOutput } from "./SessionOutput";
import type { TurnBuilder } from "./TurnBuilder";
import type { PromptRunner } from "./PromptRunner";
import { dispatchSessionUpdate } from "./dispatchSessionUpdate";
import { sessionRoutes } from "./sessionRoutes";
import type { SubagentUpdate } from "./subagents/SubagentUpdate";
import { SubagentSessions } from "./subagents/SubagentSessions";

type RouterDeps = {
  agent: AgentKind;
  turns: TurnBuilder;
  output: SessionOutput;
  callbacks: () => SessionCallbacks;
  /** False during load/resume replay, which re-sends history the transcript already has. */
  mirroring: () => boolean;
  applyThreadStatus: PromptRunner["applyThreadStatus"];
  /** The AcpSession that owns these updates, so subagent session ids route back to it. */
  owner: Parameters<typeof sessionRoutes.register>[1];
};

/** Routes one ACP session's updates: subagent sessions to their own transcripts, the rest to the main one. */
export class SessionUpdateRouter {
  readonly subagents: SubagentSessions;

  constructor(private readonly deps: RouterDeps) {
    this.subagents = new SubagentSessions(
      deps.agent,
      deps.turns,
      (subagentId, turn) => deps.callbacks().onSubagentTurn?.(subagentId, turn),
      (subagentSessionId) => sessionRoutes.register(subagentSessionId, deps.owner),
    );
  }

  update(sessionId: string, update: acp.SessionUpdate): void {
    const { deps } = this;
    if (this.subagents.owns(sessionId)) {
      if (deps.mirroring()) this.subagents.handleUpdate(sessionId, update);
      return;
    }
    dispatchSessionUpdate(update, {
      onAvailableCommands: (commands) => deps.callbacks().onAvailableCommands(commands),
      onUsage: (usage) => deps.callbacks().onUsage(usage),
      onOutput: (output) => deps.output.handleUpdate(output),
      onThreadStatus: (status) => {
        // Ignore live-status during load/resume replay — it would leave turnRunning
        // stuck true and the next user message would be sent as a steer.
        if (deps.mirroring()) deps.applyThreadStatus(status);
      },
    });
  }

  /** Replay re-announces subagents whose transcripts are already saved, so it is skipped. */
  lifecycle(sessionId: string, update: SubagentUpdate): void {
    if (this.deps.mirroring()) this.subagents.handleLifecycle(sessionId, update);
  }

  dispose(): void {
    for (const id of this.subagents.sessionIds()) sessionRoutes.unregister(id);
  }
}
