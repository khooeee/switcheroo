import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveInsideCwd } from "./resolveInsideCwd";
import { walkSessionFiles } from "./walkSessionFiles";

const run = promisify(execFile);

/**
 * Every file under the session cwd for Go to File, relative and "/"-separated. Inside a git repo
 * that is tracked plus untracked-but-not-ignored files (so node_modules and build output stay out);
 * elsewhere a capped folder walk.
 */
export async function listSessionFiles(cwd: string): Promise<string[]> {
  const root = resolveInsideCwd(cwd, "");
  try {
    const { stdout } = await run("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
      cwd: root,
      maxBuffer: 256 * 1024 * 1024,
    });
    // Unmerged files list once per stage.
    return [...new Set(stdout.split("\0").filter(Boolean))];
  } catch {
    return walkSessionFiles(root);
  }
}
