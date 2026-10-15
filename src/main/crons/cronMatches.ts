import type { CronSchedule } from "./CronSchedule";

/** True when `at` (local time) falls in a minute the schedule fires. */
export function cronMatches(schedule: CronSchedule, at: Date): boolean {
  if (!schedule.minutes.has(at.getMinutes())) return false;
  if (!schedule.hours.has(at.getHours())) return false;
  if (!schedule.months.has(at.getMonth() + 1)) return false;
  const dayOfMonth = schedule.daysOfMonth.has(at.getDate());
  const dayOfWeek = schedule.daysOfWeek.has(at.getDay());
  if (schedule.dayOfMonthStar || schedule.dayOfWeekStar) return dayOfMonth && dayOfWeek;
  return dayOfMonth || dayOfWeek;
}
