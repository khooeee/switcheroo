import { randomUUID } from "node:crypto";
import type { ToolCallUpdate } from "@agentclientprotocol/sdk";
import type { MasterEvent, TranscriptItem } from "../../shared/types";
import type { GlobalEventBus } from "../events";
import { toolFileChanges } from "./toolFileChanges";
import { fileChangeLabel } from "../../shared/fileChangeLabel";

export class ToolOutput {
  private tools = new Map<string, { id: string; at: number; tool: ToolCallUpdate }>();

  private unfinished = new Set<string>();

  finish(status: string): void {
    for (const toolCallId of this.unfinished) this.handle({ toolCallId }, status);
    this.unfinished.clear();
  }

  constructor(
    private bus: GlobalEventBus,
    private onTranscript: (item: TranscriptItem, replaceId?: string) => void,
    private pushMaster: (kind: MasterEvent["kind"], summary: string, id?: string) => void,
  ) {}

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
    this.tools.set(update.toolCallId, { id, at, tool });
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
      diffs: fileChanges.filter((file) => file.newText !== undefined),
    };
    this.onTranscript(item, previous ? id : undefined);
    if (!previous) this.pushMaster("tool", text, id);
    this.bus.updateEvent(id, { summary: text, toolStatus: item.toolStatus, fileChanges });
  }
}
