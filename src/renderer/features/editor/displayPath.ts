import { baseName } from "./baseName";
import { isUntitledPath } from "./isUntitledPath";

/** A tab's path as shown to the user: an untitled tab has only its name. */
export function displayPath(path: string): string {
  return isUntitledPath(path) ? baseName(path) : path;
}
