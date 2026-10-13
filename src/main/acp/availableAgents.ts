import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { AgentKind } from "../../shared/agentKind";
import { agentSearchPath } from "./agentSearchPath";
import { findOnPath } from "./findOnPath";
import { AGENT_PRESETS } from "./presets";

function commandExists(command: string, searchPath: string): boolean {
  return findOnPath(command, searchPath) !== undefined;
}

function isAvailable(kind: AgentKind, searchPath: string): boolean {
  try {
    // Adapter `args` getters throw when the ACP package is not installed.
    const { command, args, requiredCommand } = AGENT_PRESETS[kind];
    return (
      args.every((arg) => !arg.startsWith("/") || existsSync(arg)) &&
      commandExists(command, searchPath) &&
      (requiredCommand === undefined || commandExists(requiredCommand, searchPath))
    );
  } catch {
    return false;
  }
}

/** Agents whose CLI and ACP adapter resolve on this machine, in preset order. */
export function availableAgents(): AgentKind[] {
  const searchPath = agentSearchPath(process.env.HOME ?? homedir());
  return (Object.keys(AGENT_PRESETS) as AgentKind[]).filter((kind) =>
    isAvailable(kind, searchPath),
  );
}
