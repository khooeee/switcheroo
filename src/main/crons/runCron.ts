import * as fs from "node:fs/promises";
import type { SessionManager } from "../sessions/SessionManager";
import type { CronJob } from "./CronJob";
import { formatCronTitle } from "./formatCronTitle";

/** Start an unpinned background session for one cron run and send its prompt. */
export async function runCron(
  sessions: Pick<SessionManager, "createSession" | "enqueuePrompt">,
  job: CronJob,
  at: Date,
): Promise<void> {
  const stat = await fs.stat(job.cwd).catch(() => null);
  if (!stat?.isDirectory()) throw new Error(`cwd is not a folder: ${job.cwd}`);
  const session = await sessions.createSession(
    {
      agent: job.agent,
      cwd: job.cwd,
      title: job.title === undefined ? undefined : formatCronTitle(job.title, at),
      switcherooAware: job.switcherooAware,
      pin: false,
    },
    { focus: false },
  );
  if (session.status === "error") throw new Error(session.error ?? "session failed to start");
  await sessions.enqueuePrompt(session.id, job.prompt);
}
