import { basename } from "node:path";

/**
 * `/bin/sh` prints the environment it inherited as NUL-separated KEY=VALUE records between two
 * marks. Every supported shell reads single-quoted words literally, and none of these contain a quote.
 */
function printEnvCommand(mark: string): string {
  return ["/bin/sh", "-c", `printf %s ${mark}; /usr/bin/env -0; printf %s ${mark}`]
    .map((word) => `'${word}'`)
    .join(" ");
}

/** xonsh reads a line that starts with a quoted word as Python, so print the same records from Python. */
function xonshCommand(mark: string): string {
  return `import os, sys; sys.stdout.write("${mark}" + "".join(k + "=" + v + "\\0" for k, v in os.environ.items()) + "${mark}")`;
}

/**
 * Arguments that start `shell` as a login, interactive shell, so it reads the same startup files as
 * a new terminal, and have it print its environment between two `mark`s.
 */
export function shellInvocation(shell: string, mark: string): string[] {
  const name = basename(shell).replace(/^-/, "");
  // -Login must come first.
  if (name.startsWith("pwsh")) return ["-Login", "-Command", `& ${printEnvCommand(mark)}`];
  if (name === "nu") return ["-i", "-l", "-c", `^${printEnvCommand(mark)}`];
  if (name === "xonsh") return ["-i", "-l", "-c", xonshCommand(mark)];
  // csh rejects -l combined with other flags.
  if (name === "tcsh" || name === "csh") return ["-ic", printEnvCommand(mark)];
  return ["-i", "-l", "-c", printEnvCommand(mark)];
}
