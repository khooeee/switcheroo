import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Session } from "../../shared/session";
import { spokenMatchScore } from "./spokenMatchScore";

type Resolved = { ok: true; cwd: string } | { ok: false; error: string; candidates?: string[] };

/** Known project folders, most recently used first: `fallbackCwd`, then rail order. */
function knownCwds(sessions: Session[], fallbackCwd: string): string[] {
  const cwds = [fallbackCwd, ...sessions.map((session) => session.cwd)].filter((cwd) => cwd.trim());
  return [...new Set(cwds)];
}

/** Turn a spoken project name (or a path) into a folder the user already works in. */
export function resolveProjectCwd(sessions: Session[], project: string | undefined, fallbackCwd: string): Resolved {
  const spoken = project?.trim() ?? "";
  const cwds = knownCwds(sessions, fallbackCwd);
  if (!spoken) {
    return cwds[0] ? { ok: true, cwd: cwds[0] } : { ok: false, error: "No project folder is known yet. Ask for one." };
  }
  if (/^[~/]/.test(spoken)) {
    const cwd = spoken.startsWith("~") ? path.join(os.homedir(), spoken.slice(1)) : spoken;
    return fs.existsSync(cwd) ? { ok: true, cwd } : { ok: false, error: `${cwd} does not exist.` };
  }
  const ranked = cwds
    .map((cwd) => ({ cwd, score: spokenMatchScore(spoken, path.basename(cwd), cwd) }))
    .filter((entry) => entry.score >= 30)
    .sort((a, b) => b.score - a.score);
  const [best, second] = ranked;
  const names = (list: string[]) => list.slice(0, 6).map((cwd) => path.basename(cwd));
  if (!best) return { ok: false, error: `No known project matches "${spoken}".`, candidates: names(cwds) };
  if (second && best.score < 100 && second.score >= best.score - 5) {
    return { ok: false, error: `"${spoken}" matches more than one project. Ask which.`, candidates: names(ranked.map((entry) => entry.cwd)) };
  }
  return { ok: true, cwd: best.cwd };
}
