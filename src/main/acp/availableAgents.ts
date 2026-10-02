import { accessSync, constants, existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentKind } from "../../shared/types";
import { agentSearchPath } from "./agentSearchPath";
import { AGENT_PRESETS } from "./presets";

function isExecutableFile(file: string): boolean {
  try {
    accessSync(file, constants.X_OK);
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

function commandExists(command: string, searchPath: string): boolean {
  if (command.includes("/")) return isExecutableFile(command);
  return searchPath
    .split(":")
    .some((dir) => dir !== "" && isExecutableFile(join(dir, command)));
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
