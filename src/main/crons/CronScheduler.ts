import * as fs from "node:fs";
import { powerMonitor } from "electron";
import { cronsPath } from "../storage/userDataPaths";
import type { CronJob } from "./CronJob";
import { cronMatches } from "./cronMatches";
import { loadCrons } from "./loadCrons";

const MINUTE_MS = 60_000;

/**
 * Checks enabled crons at each local minute boundary while the app runs.
 * Minutes missed (asleep, app closed) are skipped, never caught up.
 * Reloads crons.json whenever it changes; never writes it.
 */
export class CronScheduler {
  private jobs: CronJob[] = [];
  private timer: NodeJS.Timeout | null = null;
  private lastMinute = 0;
  private loadSeq = 0;

  constructor(private readonly run: (job: CronJob, at: Date) => void) {}

  async start(): Promise<void> {
    await this.reload();
    // Only minutes that begin after launch fire, so a restart doesn't repeat this minute's runs.
    this.lastMinute = Math.floor(Date.now() / MINUTE_MS);
    // Polling stat survives editors that save by replacing the file.
    fs.watchFile(cronsPath(), { interval: 1000 }, this.onFileChange);
    powerMonitor.on("resume", this.schedule);
    this.schedule();
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    fs.unwatchFile(cronsPath(), this.onFileChange);
    powerMonitor.off("resume", this.schedule);
  }

  private onFileChange = (curr: fs.Stats, prev: fs.Stats): void => {
    if (curr.mtimeMs !== prev.mtimeMs) void this.reload();
  };

  private async reload(): Promise<void> {
    const seq = ++this.loadSeq;
    const { jobs, errors } = await loadCrons();
    if (seq !== this.loadSeq) return;
    this.jobs = jobs;
    for (const error of errors) console.warn(`[crons] ${error}`);
    console.log(`[crons] ${jobs.filter((job) => job.enabled).length} enabled of ${jobs.length}`);
  }

  /** Re-arm for the next minute boundary (also on wake, since timers stall during sleep). */
  private schedule = (): void => {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(this.tick, MINUTE_MS - (Date.now() % MINUTE_MS) + 50);
  };

  private tick = (): void => {
    const now = new Date();
    const minute = Math.floor(now.getTime() / MINUTE_MS);
    if (minute !== this.lastMinute) {
      this.lastMinute = minute;
      for (const job of this.jobs) {
        if (job.enabled && cronMatches(job.schedule, now)) this.run(job, now);
      }
    }
    this.schedule();
  };
}
