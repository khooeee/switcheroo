import type { CronSchedule } from "./CronSchedule";

type FieldSpec = { name: string; min: number; max: number };

const FIELDS: FieldSpec[] = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12 },
  { name: "day of week", min: 0, max: 7 },
];

/** Parse `minute hour day-of-month month day-of-week` (numbers, `*`, `a-b`, `/n`, lists). Throws on bad input. */
export function parseCronExpression(expression: string): CronSchedule {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== FIELDS.length) {
    throw new Error(`cron must have 5 fields (minute hour day-of-month month day-of-week), got "${expression}"`);
  }
  const [minutes, hours, daysOfMonth, months, daysOfWeek] = parts.map((part, i) =>
    parseField(part, FIELDS[i]!),
  );
  return {
    minutes: minutes!,
    hours: hours!,
    daysOfMonth: daysOfMonth!,
    months: months!,
    daysOfWeek: new Set([...daysOfWeek!].map((day) => day % 7)),
    dayOfMonthStar: parts[2]!.startsWith("*"),
    dayOfWeekStar: parts[4]!.startsWith("*"),
  };
}

function parseField(field: string, { name, min, max }: FieldSpec): Set<number> {
  const values = new Set<number>();
  for (const item of field.split(",")) {
    const match = /^(?:\*|(\d+)(?:-(\d+))?)(?:\/(\d+))?$/.exec(item);
    if (!match) throw new Error(`invalid ${name} "${item}"`);
    const [, startText, endText, stepText] = match;
    const start = startText === undefined ? min : Number(startText);
    // `*` and `n/step` run to the field max; a bare `n` is just itself.
    const end =
      endText !== undefined ? Number(endText) : startText === undefined || stepText !== undefined ? max : start;
    const step = stepText === undefined ? 1 : Number(stepText);
    if (start < min || end > max || start > end || step < 1) {
      throw new Error(`${name} "${item}" is outside ${min}-${max}`);
    }
    for (let value = start; value <= end; value += step) values.add(value);
  }
  return values;
}
