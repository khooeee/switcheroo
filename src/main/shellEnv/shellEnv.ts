import { errorMessage } from "../../shared/errorMessage";
import { fallbackEnv } from "./fallbackEnv";
import { resolveShellEnv } from "./resolveShellEnv";

/**
 * The environment a new terminal would have, which every agent starts from. Read from the user's
 * shell in the background, since Dock and desktop-launcher starts get a bare environment.
 */
class ShellEnv {
  private env: NodeJS.ProcessEnv | null = null;
  private loading: Promise<NodeJS.ProcessEnv> | null = null;

  /** Waits for the first resolve, starting it if needed; uses the fallback instead of rejecting. */
  get(): Promise<NodeJS.ProcessEnv> {
    if (this.env) return Promise.resolve(this.env);
    this.loading ??= resolveShellEnv().then(
      (env) => (this.env = env),
      (error) => {
        console.warn("[shell-env] Using fallback environment:", errorMessage(error));
        return (this.env = fallbackEnv());
      },
    );
    return this.loading;
  }

  /** The resolved environment, or the fallback until the first resolve finishes. */
  current(): NodeJS.ProcessEnv {
    return this.env ?? fallbackEnv();
  }
}

export const shellEnv = new ShellEnv();
