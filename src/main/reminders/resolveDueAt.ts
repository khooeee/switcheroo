import { localIsoTime } from "./localIsoTime";

/** When a reminder is due: exactly one of `at` (ISO 8601; no offset means local time) or `inMinutes` from now. */
export function resolveDueAt(at: unknown, inMinutes: number | undefined, now = new Date()): Date {
  if ((at === undefined) === (inMinutes === undefined)) throw new Error("Give exactly one of at or inMinutes");
  if (inMinutes !== undefined) {
    if (!(inMinutes > 0)) throw new Error("inMinutes must be more than 0");
    // Whole seconds, rounded up, since dueAt is written without milliseconds.
    return new Date(Math.ceil((now.getTime() + inMinutes * 60_000) / 1000) * 1000);
  }
  // A date alone parses as UTC midnight, never what a reminder means.
  if (typeof at !== "string" || !/T\d{2}:\d{2}/.test(at)) throw new Error("at must be an ISO 8601 time, e.g. 2026-11-13T15:00");
  const due = new Date(at);
  if (Number.isNaN(due.getTime())) throw new Error(`at is not a valid time: ${at}`);
  if (due <= now) throw new Error(`at is in the past; it is now ${localIsoTime(now)}`);
  return due;
}
