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
  const lsFiles = async (...args: string[]) => {
    const { stdout } = await run("git", ["ls-files", "-z", ...args], { cwd: root, maxBuffer: 256 * 1024 * 1024 });
    return stdout.split("\0").filter(Boolean);
  };
  try {
    const [listed, deleted] = await Promise.all([
      lsFiles("--cached", "--others", "--exclude-standard"),
      lsFiles("--deleted"),
    ]);
    // Tracked files deleted on disk are still listed, and unmerged files list once per stage.
    const gone = new Set(deleted);
    return [...new Set(listed)].filter((file) => !gone.has(file));
  } catch {
    return walkSessionFiles(root);
  }
}
