/** A parsed 5-field cron expression; each set holds the values that fire. */
export interface CronSchedule {
  minutes: ReadonlySet<number>;
  hours: ReadonlySet<number>;
  daysOfMonth: ReadonlySet<number>;
  months: ReadonlySet<number>;
  /** 0 = Sunday (7 is folded into 0). */
  daysOfWeek: ReadonlySet<number>;
  /** Day field starts with `*`. Standard cron ORs the two day fields only when neither does. */
  dayOfMonthStar: boolean;
  dayOfWeekStar: boolean;
}
