/** Draft ACP subagent lifecycle updates (RFD #1992), sent on the session that started the subagent. */
export type SubagentUpdate =
  | {
      sessionUpdate: "subagent_spawned";
      /** ACP session id of the subagent; a resumed subagent gets `<id>:generation:<n>`. */
      subagentSessionId: string;
      name?: string;
      task?: string;
      /** Instructions the parent gave the subagent (Claude). */
      prompt?: string;
    }
  | {
      sessionUpdate: "subagent_state_update";
      subagentSessionId: string;
      /** `completed`, `failed`, `cancelled`, or `disconnected` (replayed history). */
      state: string;
    };
