import { localDateStamp } from "../storage/localDateStamp";

function pad(n: number): string {
  return String(Math.trunc(Math.abs(n))).padStart(2, "0");
}

/** Local time as ISO 8601 with its UTC offset, e.g. `2026-11-13T15:00:00-08:00`. */
export function localIsoTime(at: Date): string {
  const offset = -at.getTimezoneOffset();
  const zone = `${offset < 0 ? "-" : "+"}${pad(offset / 60)}:${pad(offset % 60)}`;
  return `${localDateStamp(at)}T${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}${zone}`;
}
