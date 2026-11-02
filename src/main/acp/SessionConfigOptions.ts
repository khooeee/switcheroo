import * as acp from "@agentclientprotocol/sdk";
import { formatAgentError } from "../../shared/formatAgentError";
import type { SessionModelConfig } from "../../shared/session";
import { modelConfigFromOptions } from "./modelConfigFromOptions";

type ConfigDeps = {
  connection: () => acp.ClientConnection | null;
  sessionId: () => string | null;
  onModelConfig: (config: SessionModelConfig) => void;
  noteSystem: (text: string) => void;
};

/** The agent's session config options (model, effort, ...): latest reported set, and changing one. */
export class SessionConfigOptions {
  private options: acp.SessionConfigOption[] = [];
  /** Last reported model/effort, replayed on adopt (warm sessions report to no-op callbacks). */
  private modelConfig: SessionModelConfig | null = null;

  constructor(private readonly deps: ConfigDeps) {}

  list(): acp.SessionConfigOption[] {
    return this.options;
  }

  current(): SessionModelConfig | null {
    return this.modelConfig;
  }

  /** Record the full set from session/new, load, resume, set_config_option or config_option_update. */
  note(options: acp.SessionConfigOption[] | null | undefined): void {
    if (!options) return;
    this.options = options;
    const config = modelConfigFromOptions(options);
    if (!config) return;
    this.modelConfig = config;
    this.deps.onModelConfig(config);
  }

  /** Select a value; the agent replies with the updated set. Failures are noted in the transcript. */
  async set(configId: string, value: string): Promise<void> {
    const name = this.options.find((option) => option.id === configId)?.name ?? configId;
    try {
      const connection = this.deps.connection();
      const sessionId = this.deps.sessionId();
      if (!connection || !sessionId) throw new Error("Session not ready");
      const response = await connection.agent.request(acp.methods.agent.session.setConfigOption, {
        sessionId,
        configId,
        value,
      });
      this.note(response.configOptions);
    } catch (error) {
      this.deps.noteSystem(`Could not change ${name.toLowerCase()}: ${formatAgentError(error)}`);
    }
  }
}
