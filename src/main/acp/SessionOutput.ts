import { randomUUID } from "node:crypto";
import type * as acp from "@agentclientprotocol/sdk";
import type { AgentKind } from "../../shared/agentKind";
import type { TranscriptItem } from "../../shared/transcript";
import { stripCursorStreamNoise } from "../../shared/cursorStreamNoise";
import { ToolOutput } from "./ToolOutput";

export class SessionOutput {
  private streamingAssistantId: string | null = null;
  private streamingAssistantText = "";
  private streamingThoughtId: string | null = null;
  private tools: ToolOutput;

  constructor(
    private agent: AgentKind,
    private onTranscript: (item: TranscriptItem, replaceId?: string) => void,
  ) {
    this.tools = new ToolOutput(onTranscript);
  }

  finish(status: string): void {
    this.tools.finish(status);
  }

  reset(): void {
    this.streamingAssistantId = null;
    this.streamingAssistantText = "";
    this.streamingThoughtId = null;
  }

  handleUpdate(update: acp.SessionUpdate): void {
    switch (update.sessionUpdate) {
      case "agent_message_chunk": {
        this.streamingThoughtId = null;
        const raw = contentText(update.content);
        const chunk = this.agent === "cursor" ? stripCursorStreamNoise(raw) : raw;
        if (!chunk) return;
        if (update.messageId && this.streamingAssistantId && update.messageId !== this.streamingAssistantId) {
          this.streamingAssistantId = null;
          this.streamingAssistantText = "";
        }
        if (!this.streamingAssistantId) {
          this.streamingAssistantId = update.messageId ?? randomUUID();
          const item: TranscriptItem = {
            id: this.streamingAssistantId,
            role: "assistant",
            text: chunk,
            at: Date.now(),
          };
          this.onTranscript(item);
          this.streamingAssistantText = chunk;
        } else {
          this.streamingAssistantText += chunk;
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
        this.streamingAssistantId = null;
        this.streamingAssistantText = "";
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
      case "tool_call":
      case "tool_call_update": {
        this.streamingAssistantId = null;
        this.streamingAssistantText = "";
        this.streamingThoughtId = null;
        this.tools.handle(update);
        break;
      }
      case "plan": {
        this.onTranscript({
          id: randomUUID(),
          role: "system",
          text: "Plan updated",
          at: Date.now(),
        });
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
