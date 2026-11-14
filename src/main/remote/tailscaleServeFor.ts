import { runTailscale } from "./runTailscale";

interface TailscaleServe {
  /** e.g. `https://mac.tail1234.ts.net` */
  url: string;
  /** Stops serving that URL, e.g. `tailscale serve --https=443 off`. */
  offCommand: string;
}

type ServeConfig = { Web?: Record<string, { Handlers?: Record<string, { Proxy?: string }> }> };

/** The tailnet URL `tailscale serve` proxies to this local port, or null when it doesn't. */
export async function tailscaleServeFor(port: number): Promise<TailscaleServe | null> {
  const config = (await runTailscale(["serve", "status"])) as ServeConfig | null;
  const target = new RegExp(`^http://(127\\.0\\.0\\.1|localhost):${port}(/|$)`);
  for (const [hostPort, web] of Object.entries(config?.Web ?? {})) {
    const proxies = Object.values(web.Handlers ?? {}).map((h) => h.Proxy ?? "");
    if (!proxies.some((p) => target.test(p))) continue;
    const [host, httpsPort = "443"] = hostPort.split(":");
    const url = httpsPort === "443" ? `https://${host}` : `https://${host}:${httpsPort}`;
    return { url, offCommand: `tailscale serve --https=${httpsPort} off` };
  }
  return null;
}
