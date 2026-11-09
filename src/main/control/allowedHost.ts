/**
 * Whether the Host header names this server: loopback for scripts and agents, or a tailnet name for
 * `tailscale serve`. Anything else is refused to block DNS rebinding, where a web page points its own
 * domain at 127.0.0.1 so the browser treats this server as same-origin. Tailscale issues every `ts.net`
 * name, so a page cannot make one resolve to this machine's loopback.
 */
export function allowedHost(host: string | undefined): boolean {
  if (!host) return false;
  const name = host.replace(/:\d+$/, "").toLowerCase();
  return name === "127.0.0.1" || name === "localhost" || name.endsWith(".ts.net");
}
