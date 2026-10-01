import type { ToolCallUpdate } from "@agentclientprotocol/sdk";
import type { FileChange } from "../../shared/types";

export function toolFileChanges(tool: ToolCallUpdate): FileChange[] {
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
