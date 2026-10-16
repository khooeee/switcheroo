import type { ToolCallUpdate } from "@agentclientprotocol/sdk";
import type { FileChange } from "../../shared/fileChange";
import { shellMoves } from "./shellMoves";

export function toolFileChanges(tool: ToolCallUpdate, cwd: string): FileChange[] {
  if (tool.kind === "execute") return executeFileChanges(tool, cwd);
  const files = new Map<string, FileChange>();
  for (const block of tool.content ?? []) {
    if (block.type !== "diff") continue;
    files.set(block.path, {
      path: block.path,
      kind: tool.kind === "delete" ? "deleted" : tool.kind === "move" ? "moved"
        : block.oldText === null ? "created" : "updated",
      oldText: block.oldText,
      newText: block.newText,
    });
  }
  if (tool.kind === "edit" || tool.kind === "delete" || tool.kind === "move") {
    for (const location of tool.locations ?? []) {
      if (files.has(location.path)) continue;
      files.set(location.path, {
        path: location.path,
        kind: tool.kind === "edit" ? "updated" : tool.kind === "delete" ? "deleted" : "moved",
      });
    }
  }
  return [...files.values()];
}

/** Shell commands report no diffs; renames come from `mv` / `git mv` in the command itself. */
function executeFileChanges(tool: ToolCallUpdate, cwd: string): FileChange[] {
  const input = tool.rawInput as { command?: unknown; cwd?: unknown } | undefined;
  // Older Claude adapters wrap the command title in backticks.
  const command = typeof input?.command === "string" ? input.command : tool.title?.replace(/^`([^]*)`$/, "$1");
  if (!command || !/\bmv\b/.test(command)) return [];
  return shellMoves(command, typeof input?.cwd === "string" ? input.cwd : cwd);
}
