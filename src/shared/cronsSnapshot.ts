import type { CronInput } from "./cronInput";

export interface CronsSnapshot {
  crons: CronInput[];
  revision: string;
  errors: string[];
}
