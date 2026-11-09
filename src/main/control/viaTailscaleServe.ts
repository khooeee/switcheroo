import type { IncomingMessage } from "node:http";

/**
 * Whether `tailscale serve` proxied this request. Serve adds Tailscale-User-Login (and strips any a client
 * sent); forwarded headers cover tagged devices, which get no identity headers. Local agents send neither.
 */
export function viaTailscaleServe(req: IncomingMessage): boolean {
  const { headers } = req;
  return !!(headers["tailscale-user-login"] || headers["x-forwarded-for"] || headers["x-forwarded-proto"]);
}
