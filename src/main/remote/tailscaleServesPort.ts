import { runTailscale } from "./runTailscale";

/** Whether `tailscale serve` already proxies some tailnet URL to this local port. */
export async function tailscaleServesPort(port: number): Promise<boolean> {
  const config = await runTailscale(["serve", "status"]);
  return new RegExp(`//(127\\.0\\.0\\.1|localhost):${port}\\b`).test(JSON.stringify(config ?? {}));
}
