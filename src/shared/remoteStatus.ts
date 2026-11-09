/** Remote access as the Settings modal shows it. */
export interface RemoteStatus {
  /** Bearer token shared by Switcheroo-aware agents and the iOS app; null when the server is not running. */
  token: string | null;
  /** `switcheroo://<machine>.ts.net?token=…` to paste into the iOS app; null when not serving. */
  link: string | null;
  /** One-time command that publishes the local port to the tailnet over HTTPS. */
  serveCommand: string | null;
  /** Where `tailscale serve` publishes the local port, e.g. `https://mac.tail1234.ts.net`; null when not served. */
  servedUrl: string | null;
  /** Command that stops serving `servedUrl`. */
  unserveCommand: string | null;
  /** Why remote access is not usable, when it is enabled. */
  error: string | null;
}
