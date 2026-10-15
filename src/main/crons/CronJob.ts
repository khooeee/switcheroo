import type { AgentKind } from "../../shared/agentKind";
import type { CronSchedule } from "./CronSchedule";

/** One validated entry from crons.json. */
export interface CronJob {
  agent: AgentKind;
  /** 5-field cron in local time: minute hour day-of-month month day-of-week. */
  cron: string;
  schedule: CronSchedule;
  /** Absolute, with a leading `~` expanded. */
  cwd: string;
  /** Missing in crons.json means false. */
  enabled: boolean;
  prompt: string;
  /** YYYY-MM-DD, HH:MM and H:MM are replaced with the run's local date/time. */
  title?: string;
  switcherooAware: boolean;
}
