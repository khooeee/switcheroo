import * as fs from "node:fs";
import { powerMonitor } from "electron";
import { errorMessage } from "../../shared/errorMessage";
import { remindersPath } from "../storage/userDataPaths";
import type { Reminder } from "../../shared/reminder";
import { updateReminders } from "./updateReminders";

/** Longest single wait, so sleep, clock changes and a stuck timer are noticed within a minute. */
const MAX_WAIT_MS = 60_000;
/** Land just after the due time, never a hair before it. */
const SLACK_MS = 50;

/**
 * Fires each reminder once when it comes due, then drops it from reminders.json. Reminders that came due
 * while the app was closed or the computer slept fire late rather than never. Rechecks whenever the
 * file changes, so new reminders from agents and hand edits apply within a second.
 */
export class ReminderScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private lastError: string | null = null;

  constructor(private readonly fire: (reminder: Reminder) => void) {}

  start(): void {
    this.running = true;
    // Polling stat survives editors that save by replacing the file.
    fs.watchFile(remindersPath(), { interval: 1000 }, this.onFileChange);
    powerMonitor.on("resume", this.check);
    this.check();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    fs.unwatchFile(remindersPath(), this.onFileChange);
    powerMonitor.off("resume", this.check);
  }

  private onFileChange = (curr: fs.Stats, prev: fs.Stats): void => {
    if (curr.mtimeMs !== prev.mtimeMs) this.check();
  };

  /** Fire what is due, then wait for the next one. */
  private check = (): void => {
    void this.fireDue().then((nextDueMs) => this.schedule(nextDueMs));
  };

  /** Removes and fires due reminders; returns when the next one is due (Infinity when none). */
  private async fireDue(): Promise<number> {
    const now = Date.now();
    let due: Reminder[];
    let nextDueMs: number;
    try {
      [due, nextDueMs] = await updateReminders((reminders) => {
        const due = reminders.filter((reminder) => Date.parse(reminder.dueAt) <= now);
        const rest = reminders.filter((reminder) => !due.includes(reminder));
        const next = Math.min(...rest.map((reminder) => Date.parse(reminder.dueAt)));
        return [due.length ? rest : reminders, [due, next] as const];
      });
      this.lastError = null;
    } catch (error) {
      const message = errorMessage(error);
      if (message !== this.lastError) console.warn(`[reminders] ${message}`);
      this.lastError = message;
      return Infinity;
    }
    for (const reminder of due) {
      try {
        this.fire(reminder);
      } catch (error) {
        console.warn(`[reminders] ${reminder.id} failed:`, errorMessage(error));
      }
    }
    return nextDueMs;
  }

  private schedule(nextDueMs: number): void {
    if (!this.running) return;
    if (this.timer) clearTimeout(this.timer);
    const wait = Math.min(MAX_WAIT_MS, Math.max(0, nextDueMs - Date.now()) + SLACK_MS);
    this.timer = setTimeout(this.check, wait);
  }
}
