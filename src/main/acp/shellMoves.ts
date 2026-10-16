import * as fs from "node:fs";
import * as path from "node:path";
import type { FileChange } from "../../shared/fileChange";
import { shellCommands, type ShellWord } from "./shellCommands";

const SHELLS = new Set(["sh", "bash", "zsh"]);
/** Words that can precede a command without changing what it runs. */
const PREFIXES = new Set(["then", "do", "else", "{", "!"]);

/** Renames a shell command makes with `mv` or `git mv`, as absolute paths resolved from `cwd`. */
export function shellMoves(command: string, cwd: string): FileChange[] {
  const moves: FileChange[] = [];
  let dir = cwd;
  for (const words of shellCommands(command)) {
    const args = withoutPrefixes(words);
    if (args[0] === "cd") {
      const to = args[1];
      // Relative paths after an unknown `cd` cannot be resolved.
      if (args.length !== 2 || to == null || to === "-") break;
      dir = path.resolve(dir, to);
      continue;
    }
    const script = inlineScript(args);
    if (script != null) {
      moves.push(...shellMoves(script, dir));
      continue;
    }
    const move = moveArgs(args, dir);
    if (!move) continue;
    const target = move.paths.at(-1)!;
    const sources = move.paths.slice(0, -1);
    const into = sources.length > 1 || target.endsWith("/");
    for (const source of sources) {
      const from = path.resolve(move.dir, source);
      moves.push({ kind: "moved", fromPath: from, path: destination(from, path.resolve(move.dir, target), into) });
    }
  }
  return moves;
}

function withoutPrefixes(words: ShellWord[]): ShellWord[] {
  let i = 0;
  while (i < words.length && (PREFIXES.has(words[i] ?? "") || /^\w+=/.test(words[i] ?? ""))) i++;
  return words.slice(i);
}

/** The script of `bash -c '…'` / `/bin/zsh -lc '…'`. */
function inlineScript(args: ShellWord[]): string | null {
  if (args[0] == null || !SHELLS.has(path.basename(args[0]))) return null;
  const flag = args.findIndex((arg, i) => i > 0 && /^-[a-z]*c[a-z]*$/.test(arg ?? ""));
  return flag > 0 ? args[flag + 1] ?? null : null;
}

/** Operands of `mv` / `git mv` (sources then target) and the directory they are relative to. */
function moveArgs(args: ShellWord[], dir: string): { dir: string; paths: string[] } | null {
  let i = 1;
  const git = args[0] === "git";
  if (git) {
    while (args[i]?.startsWith("-")) {
      if (args[i] === "-C") {
        const to = args[i + 1];
        if (to == null) return null;
        dir = path.resolve(dir, to);
      }
      i += args[i] === "-C" || args[i] === "-c" ? 2 : 1;
    }
    if (args[i++] !== "mv") return null;
  } else if (args[0] !== "mv") {
    return null;
  }
  // `git mv -n` is a dry run; `mv -t dir` puts the target first.
  const unsupported = git ? /^(-n|--dry-run)$/ : /^(-t|--target-directory)/;
  const paths: string[] = [];
  let options = true;
  for (const arg of args.slice(i)) {
    if (arg == null) return null;
    if (options && arg === "--") options = false;
    else if (options && arg.startsWith("-")) {
      if (unsupported.test(arg)) return null;
    } else paths.push(arg);
  }
  return paths.length >= 2 ? { dir, paths } : null;
}

/** `mv a dir` lands at `dir/a` when `dir` is a directory; known once the move has run. */
function destination(from: string, to: string, into: boolean): string {
  const inside = path.join(to, path.basename(from));
  if (into) return inside;
  return fs.statSync(to, { throwIfNoEntry: false })?.isDirectory() && fs.existsSync(inside) ? inside : to;
}
