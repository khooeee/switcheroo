/** Header fields for a subagent shown in the right rail, read from its row in the parent transcript. */
export type SubagentRailInfo = {
  id: string;
  name: string;
  task?: string;
  /** `running`, `completed`, `failed`, `cancelled` or `disconnected`. */
  state?: string;
};
