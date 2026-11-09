import { runTailscale } from "./runTailscale";

/** This machine's MagicDNS name (e.g. `mac.tail1234.ts.net`), or null without Tailscale. */
export async function tailscaleDnsName(): Promise<string | null> {
  const status = (await runTailscale(["status"])) as { Self?: { DNSName?: unknown } } | null;
  const name = status?.Self?.DNSName;
  return typeof name === "string" && name ? name.replace(/\.$/, "") : null;
}
