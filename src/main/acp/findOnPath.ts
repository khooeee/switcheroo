import { accessSync, constants, statSync } from "node:fs";
import { join } from "node:path";

function isExecutableFile(file: string): boolean {
  try {
    accessSync(file, constants.X_OK);
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

/** Absolute path of an executable `command` on `searchPath` (or `command` itself if it is a path). */
export function findOnPath(command: string, searchPath: string): string | undefined {
  if (command.includes("/")) return isExecutableFile(command) ? command : undefined;
  return searchPath
    .split(":")
    .filter((dir) => dir !== "")
    .map((dir) => join(dir, command))
    .find(isExecutableFile);
}
