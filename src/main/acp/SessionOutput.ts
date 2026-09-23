import { randomUUID } from "node:crypto";
import type * as acp from "@agentclientprotocol/sdk";
import type { AgentKind, DiffPayload, MasterEvent, TranscriptItem } from "../../shared/types";
import type { GlobalEventBus } from "../events";
import { stripCursorStreamNoise } from "../../shared/cursorStreamNoise";

export class SessionOutput {
  private streamingAssistantId: string | null = null;
  private streamingAssistantText = "";
  private streamingThoughtId: string | null = null;

  constructor(
    private agentKind: AgentKind,
    private bus: GlobalEventBus,
    private onTranscript: (item: TranscriptItem, replaceId?: string) => void,
    private pushMaster: (kind: MasterEvent["kind"], summary: string, id?: string) => void,
  ) {}

  reset(): void {
    this.streamingAssistantId = null;
    this.streamingAssistantText = "";
    this.streamingThoughtId = null;
  }

  handleUpdate(update: acp.SessionUpdate): void {
    switch (update.sessionUpdate) {
      case "agent_message_chunk": {
        const raw = contentText(update.content);
        const chunk = this.agentKind === "cursor" ? stripCursorStreamNoise(raw) : raw;
        if (!chunk) return;
        if (!this.streamingAssistantId) {
          this.streamingAssistantId = randomUUID();
          const item: TranscriptItem = {
            id: this.streamingAssistantId,
            role: "assistant",
            text: chunk,
            at: Date.now(),
          };
          this.onTranscript(item);
          this.streamingAssistantText = chunk;
          this.pushMaster("message", this.streamingAssistantText, item.id);
        } else {
          this.streamingAssistantText += chunk;
          this.bus.updateSummary(this.streamingAssistantId, this.streamingAssistantText);
          const item: TranscriptItem = {
            id: this.streamingAssistantId,
            role: "assistant",
            text: chunk,
            at: Date.now(),
          };
          this.onTranscript(item, this.streamingAssistantId);
        }
        break;
      }
      case "agent_thought_chunk": {
        const chunk = contentText(update.content);
        if (!chunk) return;
        if (!this.streamingThoughtId) {
          this.streamingThoughtId = randomUUID();
          this.onTranscript({
            id: this.streamingThoughtId,
            role: "thought",
            text: chunk,
            at: Date.now(),
          });
        } else {
          this.onTranscript(
            {
              id: this.streamingThoughtId,
              role: "thought",
              text: chunk,
              at: Date.now(),
            },
            this.streamingThoughtId,
          );
        }
        break;
      }
      case "tool_call": {
        const diffs = extractDiffs(update);
        const item: TranscriptItem = {
          id: randomUUID(),
          role: "tool",
          text: update.title ?? update.toolCallId,
          at: Date.now(),
          toolCallId: update.toolCallId,
          toolStatus: update.status ?? undefined,
          toolTitle: update.title ?? undefined,
          diffs,
        };
        this.onTranscript(item);
        this.pushMaster("tool", update.title ?? "Tool call", item.id);
        break;
      }
      case "tool_call_update": {
        const diffs = extractDiffs(update);
        const item: TranscriptItem = {
          id: randomUUID(),
          role: "tool",
          text: update.title ?? update.toolCallId,
          at: Date.now(),
          toolCallId: update.toolCallId,
          toolStatus: update.status ?? "updated",
          toolTitle: update.title ?? undefined,
          diffs,
        };
        this.onTranscript(item);
        break;
      }
      case "plan": {
        this.pushMaster("plan", "Plan updated");
        break;
      }
      default:
        break;
    }
  }
}

function contentText(content: acp.ContentBlock | undefined): string {
  if (!content) return "";
  if (content.type === "text") return content.text;
  return `[${content.type}]`;
}

function extractDiffs(update: {
  content?: acp.ToolCallContent[] | null;
}): DiffPayload[] {
  const diffs: DiffPayload[] = [];
  for (const block of update.content ?? []) {
    if (block.type === "diff") {
      diffs.push({
        path: block.path,
        oldText: block.oldText,
        newText: block.newText,
      });
    }
  }
  return diffs;
}
