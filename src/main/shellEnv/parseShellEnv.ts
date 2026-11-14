/** Per-process shell state, the resolver's own flag, and variables that change how Electron or Node run. */
const SKIPPED = new Set(["PWD", "OLDPWD", "SHLVL", "_", "NODE_OPTIONS", "SWITCHEROO_RESOLVING_SHELL_ENV"]);

function keep(key: string): boolean {
  return !SKIPPED.has(key) && !key.startsWith("ELECTRON_");
}

/** NUL-separated KEY=VALUE records between the first two `mark`s; undefined until both have arrived. */
export function parseShellEnv(output: string, mark: string): NodeJS.ProcessEnv | undefined {
  const start = output.indexOf(mark);
  if (start < 0) return undefined;
  const end = output.indexOf(mark, start + mark.length);
  if (end < 0) return undefined;
  const env: NodeJS.ProcessEnv = {};
  for (const record of output.slice(start + mark.length, end).split("\0")) {
    const eq = record.indexOf("=");
    if (eq <= 0) continue;
    const key = record.slice(0, eq);
    if (keep(key)) env[key] = record.slice(eq + 1);
  }
  return env;
}
