import { randomUUID } from "node:crypto";

/** Local-date-prefixed id for a new agent session folder: `YYYY-MM-DD-<uuid>`. */
export function newSessionId(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}-${randomUUID()}`;
}
