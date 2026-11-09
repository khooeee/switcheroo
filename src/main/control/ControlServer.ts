import { createServer, type Server } from "node:http";
import type { AppSettings } from "../../shared/appSettings";
import { errorMessage } from "../../shared/errorMessage";
import type { RemoteStatus } from "../../shared/remoteStatus";
import type { SessionManager } from "../sessions/SessionManager";
import { RemoteEventHub } from "../remote/RemoteEventHub";
import { tailscaleDnsName } from "../remote/tailscaleDnsName";
import { tailscaleServeFor } from "../remote/tailscaleServeFor";
import { clearControlFile, writeControlFile, type ControlEndpoint } from "./controlFile";
import { createControlToken } from "./createControlToken";
import { handleServerRequest } from "./handleServerRequest";
import { liveControlEndpoint } from "./liveControlEndpoint";
import { loadControlToken } from "./loadControlToken";
import { sendJson } from "./sendJson";

type ControlSettings = Pick<AppSettings, "remoteEnabled" | "controlPort">;

/**
 * Localhost control API for scripts (via control.json) and the iOS app (via `tailscale serve`), plus the
 * MCP server every session uses. Always on; `remoteEnabled` only gates requests that come through Tailscale.
 */
export class ControlServer {
  private hub: RemoteEventHub;
  private server: Server | null = null;
  private endpoint: ControlEndpoint | null = null;
  private wantedPort = 0;
  private remoteEnabled = false;
  private error: string | null = null;
  private applying = Promise.resolve();

  constructor(private sessions: SessionManager) {
    this.hub = new RemoteEventHub(sessions);
  }

  /** Start, or move to a new port, to match settings; calls apply in order. */
  apply(settings: ControlSettings): Promise<void> {
    return this.enqueue(() => this.reconcile(settings));
  }

  /** Replace the token; agents re-read control.json, and the iOS app needs the new link. */
  rotateToken(): Promise<void> {
    return this.enqueue(() => this.swapToken());
  }

  stop(): Promise<void> {
    return this.enqueue(async () => {
      await this.close();
      liveControlEndpoint.set(null);
    });
  }

  async status(): Promise<RemoteStatus> {
    // Still reported when unticked, so Settings can show how to stop serving.
    const serve = this.endpoint ? await tailscaleServeFor(this.endpoint.port) : null;
    const off = {
      token: this.endpoint?.token ?? null,
      link: null,
      serveCommand: null,
      servedUrl: serve?.url ?? null,
      unserveCommand: serve?.offCommand ?? null,
    };
    if (!this.remoteEnabled) return { ...off, error: null };
    if (!this.endpoint || this.error) return { ...off, error: this.error ?? "The control server is not running." };
    const { port, token } = this.endpoint;
    const host = await tailscaleDnsName();
    const serveCommand = `tailscale serve --bg ${port}`;
    if (!host) return { ...off, serveCommand, error: "Tailscale is not installed or not logged in." };
    return { ...off, link: `switcheroo://${host}?token=${token}`, serveCommand, error: null };
  }

  private async reconcile({ remoteEnabled, controlPort }: ControlSettings): Promise<void> {
    this.remoteEnabled = remoteEnabled;
    if (process.env.SWITCHEROO_CONTROL === "0") return liveControlEndpoint.set(null);
    if (this.server && controlPort === this.wantedPort) return;
    await this.close();
    this.wantedPort = controlPort;
    this.error = null;
    try {
      const token = await loadControlToken();
      const server = await this.listenFixedOrRandom(controlPort);
      const port = (server.address() as { port: number }).port;
      this.server = server;
      this.endpoint = { port, token, spec: `http://127.0.0.1:${port}/` };
      await writeControlFile(this.endpoint);
      console.log(`[control] listening on ${this.endpoint.spec}`);
    } catch (error) {
      this.error = `Could not start the control server: ${errorMessage(error)}`;
      console.warn(`[control] ${this.error}`);
    }
    // Sessions starting meanwhile wait for this to build their MCP server URL.
    liveControlEndpoint.set(this.endpoint);
  }

  /** One failed task must not wedge the ones after it. */
  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.applying.then(task);
    this.applying = run.catch(() => undefined);
    return run;
  }

  private async swapToken(): Promise<void> {
    const token = await createControlToken();
    if (!this.endpoint) return;
    this.endpoint = { ...this.endpoint, token };
    liveControlEndpoint.set(this.endpoint);
    await writeControlFile(this.endpoint);
    // Open event streams were authorized with the old token.
    this.hub.closeAll();
  }

  /** A busy fixed port (e.g. another Switcheroo build) still leaves agents a random one. */
  private async listenFixedOrRandom(port: number): Promise<Server> {
    try {
      return await this.listen(port);
    } catch (error) {
      this.error = `Port ${port} is busy (${errorMessage(error)}), so the iOS app can't connect.`;
      console.warn(`[control] ${this.error}`);
      return this.listen(0);
    }
  }

  private async listen(port: number): Promise<Server> {
    const server = createServer((req, res) => {
      const baseUrl = this.endpoint?.spec ?? `http://127.0.0.1:${port}/`;
      // A throw before any route answers (e.g. a malformed %-escape) must not leave the socket hanging.
      void handleServerRequest(req, res, {
        token: this.endpoint?.token ?? "",
        baseUrl,
        sessions: this.sessions,
        hub: this.hub,
        remoteEnabled: () => this.remoteEnabled,
      }).catch((error) => {
        if (res.headersSent) res.end();
        else sendJson(res, 400, { error: errorMessage(error) });
      });
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
    const endpoint = this.endpoint;
    this.server = null;
    this.endpoint = null;
    if (endpoint) await clearControlFile(endpoint);
    if (!server) return;
    this.hub.closeAll();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
