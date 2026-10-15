import * as os from "node:os";
import * as path from "node:path";
import { isAgentKind } from "../../shared/agentKind";
import { errorMessage } from "../../shared/errorMessage";
import type { CronJob } from "./CronJob";
import { parseCronExpression } from "./parseCronExpression";

/** Validate parsed crons.json. Bad entries are skipped and described in `errors`. */
export function parseCronsFile(parsed: unknown): { jobs: CronJob[]; errors: string[] } {
  const crons = (parsed as { crons?: unknown } | null)?.crons;
  if (!Array.isArray(crons)) return { jobs: [], errors: ['expected { "crons": [...] }'] };
  const jobs: CronJob[] = [];
  const errors: string[] = [];
  crons.forEach((entry, index) => {
    try {
      jobs.push(parseEntry(entry));
    } catch (error) {
      errors.push(`crons[${index}]: ${errorMessage(error)}`);
    }
  });
  return { jobs, errors };
}

function parseEntry(entry: unknown): CronJob {
  if (!entry || typeof entry !== "object") throw new Error("expected an object");
  const raw = entry as Record<string, unknown>;
  if (!isAgentKind(raw.agent)) throw new Error(`unknown agent ${JSON.stringify(raw.agent)}`);
  if (typeof raw.cron !== "string") throw new Error("cron is required");
  if (typeof raw.prompt !== "string" || !raw.prompt.trim()) throw new Error("prompt is required");
  if (typeof raw.cwd !== "string" || !raw.cwd.trim()) throw new Error("cwd is required");
  const cwd = raw.cwd.replace(/^~(?=$|\/)/, os.homedir());
  if (!path.isAbsolute(cwd)) throw new Error(`cwd must be absolute: ${raw.cwd}`);
  const title = typeof raw.title === "string" && raw.title.trim() ? raw.title : undefined;
  return {
    agent: raw.agent,
    cron: raw.cron,
    schedule: parseCronExpression(raw.cron),
    cwd,
    enabled: raw.enabled === true,
    prompt: raw.prompt,
    title,
    switcherooAware: raw.switcherooAware === true,
  };
}
