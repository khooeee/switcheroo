import { createServer, type Server } from "node:http";
import { randomBytes } from "node:crypto";
import type { SessionManager } from "../sessions";
import { clearControlFile, writeControlFile, type ControlEndpoint } from "./controlAuth";
import { handleControlRequest } from "./controlRoutes";

/** Localhost HTTP control plane for SessionManager (curl / scripts). */
export class ControlServer {
  private server: Server | null = null;
  private endpoint: ControlEndpoint | null = null;

  async start(sessions: SessionManager): Promise<ControlEndpoint | null> {
    if (process.env.SWITCHEROO_CONTROL === "0") return null;

    const token = randomBytes(24).toString("hex");
    this.server = createServer((req, res) => {
      const baseUrl = this.endpoint?.spec ?? "http://127.0.0.1/";
      void handleControlRequest(req, res, token, baseUrl, sessions);
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(0, "127.0.0.1", () => resolve());
    });

    const addr = this.server.address();
    if (!addr || typeof addr === "string") throw new Error("Control server failed to bind");
    this.endpoint = {
      port: addr.port,
      token,
      spec: `http://127.0.0.1:${addr.port}/`,
    };
    await writeControlFile(this.endpoint);
    console.log(`[control] listening on ${this.endpoint.spec}`);
    return this.endpoint;
  }

  async stop(): Promise<void> {
    if (this.endpoint) {
      await clearControlFile(this.endpoint);
      this.endpoint = null;
    }
    const server = this.server;
    this.server = null;
    if (!server) return;
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}
