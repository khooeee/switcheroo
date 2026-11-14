import { userInfo } from "node:os";

/** The user's shell: `$SHELL`, else their passwd entry, else `/bin/sh`. */
export function userShell(): string {
  if (process.env.SHELL) return process.env.SHELL;
  try {
    return userInfo().shell || "/bin/sh";
  } catch {
    return "/bin/sh";
  }
}
