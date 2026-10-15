import { randomUUID } from "node:crypto";
import type { ToolCallUpdate } from "@agentclientprotocol/sdk";
import type { TranscriptItem } from "../../shared/transcript";
import { toolFileChanges } from "./toolFileChanges";
import { toolImages } from "./toolImages";
import { fileChangeLabel } from "../../shared/fileChangeLabel";

export class ToolOutput {
  private tools = new Map<string, { id: string; at: number; tool: ToolCallUpdate; images: string[] }>();

  private unfinished = new Set<string>();

  finish(status: string): void {
    for (const toolCallId of this.unfinished) this.handle({ toolCallId }, status);
    this.unfinished.clear();
  }

  constructor(private onTranscript: (item: TranscriptItem, replaceId?: string) => void) {}

  handle(update: ToolCallUpdate, displayStatus?: string): void {
    const previous = this.tools.get(update.toolCallId);
    const tool: ToolCallUpdate = { ...previous?.tool, toolCallId: update.toolCallId };
    // ACP updates are partial: omitted and null fields retain their old values.
    for (const key of ["title", "kind", "status", "content", "locations"] as const) {
      const value = update[key];
      if (value != null) Object.assign(tool, { [key]: value });
    }
    const id = previous?.id ?? randomUUID();
    const at = previous?.at ?? Date.now();
    // Only re-scan when content changed; status-only updates keep the saved images.
    const images = update.content != null ? toolImages(tool) : previous?.images ?? [];
    this.tools.set(update.toolCallId, { id, at, tool, images });
    if (tool.status === "completed" || tool.status === "failed") this.unfinished.delete(update.toolCallId);
    else this.unfinished.add(update.toolCallId);
    const status = displayStatus ?? tool.status ?? undefined;
    const fileChanges = toolFileChanges(tool);
    const text = fileChanges.length
      ? fileChanges.map((file) => fileChangeLabel(file, status)).join("\n")
      : tool.title ?? update.toolCallId;
    const item: TranscriptItem = {
      id, at, role: "tool", text,
      toolCallId: update.toolCallId,
      toolTitle: tool.title ?? undefined,
      toolStatus: status,
      fileChanges,
      images: images.length ? images : undefined,
    };
    this.onTranscript(item, previous ? id : undefined);
  }
}
