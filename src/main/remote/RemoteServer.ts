import { createServer, type Server } from "node:http";
import type { AppSettings } from "../../shared/appSettings";
import { errorMessage } from "../../shared/errorMessage";
import type { RemoteStatus } from "../../shared/remoteStatus";
import type { SessionManager } from "../sessions/SessionManager";
import { handleRemoteRequest } from "./handleRemoteRequest";
import { loadRemoteToken } from "./loadRemoteToken";
import { RemoteEventHub } from "./RemoteEventHub";
import { tailscaleDnsName } from "./tailscaleDnsName";
import { tailscaleServesPort } from "./tailscaleServesPort";

type RemoteSettings = Pick<AppSettings, "remoteEnabled" | "remotePort">;

/** The iOS app's server: localhost only; `tailscale serve` publishes it to the tailnet over HTTPS. */
export class RemoteServer {
  private hub: RemoteEventHub;
  private server: Server | null = null;
  private port = 0;
  private token = "";
  private error: string | null = null;
  private applying = Promise.resolve();

  constructor(private sessions: SessionManager) {
    this.hub = new RemoteEventHub(sessions);
  }

  /** Start, stop or move ports to match settings; calls apply in order. */
  apply(settings: RemoteSettings): Promise<void> {
    this.applying = this.applying.then(() => this.reconcile(settings));
    return this.applying;
  }

  stop(): Promise<void> {
    return this.apply({ remoteEnabled: false, remotePort: 0 });
  }

  async status(): Promise<RemoteStatus> {
    const off = { link: null, serveCommand: null, served: false };
    if (!this.server) return { ...off, error: this.error };
    const [host, served] = await Promise.all([tailscaleDnsName(), tailscaleServesPort(this.port)]);
    const serveCommand = `tailscale serve --bg ${this.port}`;
    if (!host) return { ...off, serveCommand, error: "Tailscale is not installed or not logged in." };
    return { link: `switcheroo://${host}?token=${this.token}`, serveCommand, served, error: null };
  }

  private async reconcile({ remoteEnabled, remotePort }: RemoteSettings): Promise<void> {
    const port = remoteEnabled ? remotePort : 0;
    if (this.server && port === this.port) return;
    await this.close();
    this.error = null;
    if (!port) return;
    try {
      this.token ||= await loadRemoteToken();
      this.server = await this.listen(port);
      this.port = port;
      console.log(`[remote] listening on port ${port}`);
    } catch (error) {
      this.error = `Could not listen on port ${port}: ${errorMessage(error)}`;
      console.warn(`[remote] ${this.error}`);
    }
  }

  private async listen(port: number): Promise<Server> {
    const server = createServer((req, res) => {
      const baseUrl = `http://127.0.0.1:${port}/`;
      void handleRemoteRequest(req, res, { token: this.token, baseUrl, sessions: this.sessions, hub: this.hub });
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });
    return server;
  }

  private async close(): Promise<void> {
    const server = this.server;
    this.server = null;
    this.port = 0;
    if (!server) return;
    this.hub.closeAll();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
