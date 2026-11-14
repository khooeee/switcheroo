import type { AgentKind } from "./agentKind";

/** Editable fields stored in crons.json. */
export interface CronInput {
  agent: AgentKind;
  cron: string;
  cwd: string;
  enabled?: boolean;
  prompt: string;
  title?: string;
}
