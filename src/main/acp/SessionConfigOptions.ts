import * as acp from "@agentclientprotocol/sdk";
import type { SessionModelConfig } from "../../shared/session";
import { modelConfigFromOptions } from "./modelConfigFromOptions";

type ConfigDeps = {
  connection: () => acp.ClientConnection | null;
  sessionId: () => string | null;
  onModelConfig: (config: SessionModelConfig) => void;
};

/** The agent's session config options (model, effort, ...): latest reported set, and changing one. */
export class SessionConfigOptions {
  private options: acp.SessionConfigOption[] = [];
  /** Last model/effort sent to callbacks; unchanged reports are skipped (each one emits and persists). */
  private reported: SessionModelConfig | null = null;

  constructor(private readonly deps: ConfigDeps) {}

  list(): acp.SessionConfigOption[] {
    return this.options;
  }

  /** Record the full set from session/new, load, resume, fork, set_config_option or config_option_update. */
  note(options: acp.SessionConfigOption[] | null | undefined): void {
    if (!options) return;
    this.options = options;
    const config = modelConfigFromOptions(options);
    if (!config || (config.model === this.reported?.model && config.effort === this.reported?.effort)) return;
    this.reported = config;
    this.deps.onModelConfig(config);
  }

  /** Report the current model/effort again, to callbacks that replaced the warm pool's no-op ones. */
  replay(): void {
    if (this.reported) this.deps.onModelConfig(this.reported);
  }

  /** Start from a parent session's options without reporting; the fork's record already has them. */
  inherit(parent: SessionConfigOptions): void {
    this.options = parent.options;
    this.reported = parent.reported;
  }

  /** Select a value; the agent replies with the updated set. */
  async set(configId: string, value: string): Promise<void> {
    const connection = this.deps.connection();
    const sessionId = this.deps.sessionId();
    if (!connection || !sessionId) throw new Error("Session not ready");
    const response = await connection.agent.request(acp.methods.agent.session.setConfigOption, {
      sessionId,
      configId,
      value,
    });
    this.note(response.configOptions);
  }
}
