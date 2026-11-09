import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolvePathCommand } from "../acp/resolvePathCommand";

const run = promisify(execFile);
/** The CLI inside the Mac App Store / standalone Tailscale app. */
const APP_CLI = "/Applications/Tailscale.app/Contents/MacOS/Tailscale";

/** Parsed JSON from a `tailscale … --json` command, or null when the CLI is missing or fails. */
export async function runTailscale(args: string[]): Promise<unknown> {
  try {
    const { stdout } = await run(resolvePathCommand("tailscale", [APP_CLI]), [...args, "--json"], { timeout: 5000 });
    return JSON.parse(stdout) as unknown;
  } catch {
    return null;
  }
}
