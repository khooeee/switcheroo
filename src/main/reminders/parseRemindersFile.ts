import { errorMessage } from "../../shared/errorMessage";
import type { Reminder } from "./Reminder";

/** Validate parsed reminders.json. Bad entries are skipped and described in `errors`. */
export function parseRemindersFile(parsed: unknown): { reminders: Reminder[]; errors: string[] } {
  const reminders = (parsed as { reminders?: unknown } | null)?.reminders;
  if (!Array.isArray(reminders)) return { reminders: [], errors: ['expected { "reminders": [...] }'] };
  const valid: Reminder[] = [];
  const errors: string[] = [];
  reminders.forEach((entry, index) => {
    try {
      valid.push(parseEntry(entry));
    } catch (error) {
      errors.push(`reminders[${index}]: ${errorMessage(error)}`);
    }
  });
  return { reminders: valid, errors };
}

function parseEntry(entry: unknown): Reminder {
  if (!entry || typeof entry !== "object") throw new Error("expected an object");
  const raw = entry as Record<string, unknown>;
  if (typeof raw.id !== "string" || !raw.id.trim()) throw new Error("id is required");
  if (typeof raw.message !== "string" || !raw.message.trim()) throw new Error("message is required");
  if (typeof raw.dueAt !== "string" || Number.isNaN(Date.parse(raw.dueAt))) {
    throw new Error(`dueAt is not a valid time: ${JSON.stringify(raw.dueAt)}`);
  }
  const sessionId = typeof raw.sessionId === "string" && raw.sessionId ? raw.sessionId : undefined;
  return { id: raw.id, dueAt: raw.dueAt, message: raw.message, ...(sessionId ? { sessionId } : {}) };
}
