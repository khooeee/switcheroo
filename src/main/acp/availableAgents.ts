import { existsSync } from "node:fs";
import type { AgentKind } from "../../shared/agentKind";
import { findOnPath } from "./findOnPath";
import { AGENT_PRESETS } from "./presets";
import { shellEnv } from "../shellEnv/shellEnv";

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

/** Agents whose CLI and ACP adapter resolve on the shell's PATH, in preset order. */
export async function availableAgents(): Promise<AgentKind[]> {
  const searchPath = (await shellEnv.get()).PATH ?? "";
  return (Object.keys(AGENT_PRESETS) as AgentKind[]).filter((kind) =>
    isAvailable(kind, searchPath),
  );
}
