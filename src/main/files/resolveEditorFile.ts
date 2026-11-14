import * as path from "node:path";
import { resolveInsideCwd } from "./resolveInsideCwd";

/** Editor tabs can hold an absolute path chosen with Open File, or a project-relative path. */
export function resolveEditorFile(cwd: string, filePath: string): string {
  return path.isAbsolute(filePath) ? path.normalize(filePath) : resolveInsideCwd(cwd, filePath);
}
