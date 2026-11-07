import { randomUUID } from "node:crypto";
import { localDateStamp } from "../storage/localDateStamp";

/** Local-date-prefixed id for a new agent session folder: `YYYY-MM-DD-<uuid>`. */
export function newSessionId(now = new Date()): string {
  return `${localDateStamp(now)}-${randomUUID()}`;
}
