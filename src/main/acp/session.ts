import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as acp from "@agentclientprotocol/sdk";
import type {
  AgentKind,
  DiffPayload,
  MasterEvent,
  PermissionRequest,
  TranscriptItem,
} from "../../shared/types";
import { AGENT_PRESETS, agentLabel } from "./presets";
import type { GlobalEventBus } from "../events";
import { stripCursorStreamNoise } from "../../shared/cursorStreamNoise";

type PermissionResolver = (optionId: string | "cancelled") => void;
type AskQuestionResolver = (outcome: unknown) => void;

export interface SessionCallbacks {
  onTranscript: (item: TranscriptItem, replaceId?: string) => void;
  onStatus: (status: "connecting" | "ready" | "running" | "error" | "idle", error?: string | null) => void;
  onPermission: (req: PermissionRequest) => void;
  onAskQuestion: (req: {
    requestId: string;
    tabId: string;
    toolCallId: string;
    title?: string;
    questions: Array<{
      id: string;
      prompt: string;
      options: Array<{ id: string; label: string }>;
      allowMultiple?: boolean;
    }>;
  }) => void;
}

export class AcpSession {
  readonly tabId: string;
  readonly agentKind: AgentKind;
  readonly cwd: string;
  sessionId: string | null = null;

  private proc: ChildProcessWithoutNullStreams | null = null;
  private connection: acp.ClientConnection | null = null;
  private active: acp.ActiveSession | null = null;
  private bus: GlobalEventBus;
  private cb: SessionCallbacks;
  private pendingPermissions = new Map<string, PermissionResolver>();
  private pendingAsk = new Map<string, AskQuestionResolver>();
  private streamingAssistantId: string | null = null;
  private streamingAssistantText = "";
  private streamingThoughtId: string | null = null;
  private disposed = false;

  constructor(
    tabId: string,
    agentKind: AgentKind,
    cwd: string,
    bus: GlobalEventBus,
    cb: SessionCallbacks,
  ) {
    this.tabId = tabId;
    this.agentKind = agentKind;
    this.cwd = cwd;
    this.bus = bus;
    this.cb = cb;
  }

  async start(): Promise<void> {
    this.cb.onStatus("connecting");
    const preset = AGENT_PRESETS[this.agentKind];

    this.proc = spawn(preset.command, preset.args, {
      cwd: this.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, HOME: process.env.HOME },
      shell: false,
    });

    this.proc.stderr.on("data", (buf: Buffer) => {
      const line = buf.toString();
      if (line.trim()) console.error(`[acp:${this.agentKind}]`, line.trim());
    });

    this.proc.on("exit", (code) => {
      if (!this.disposed) {
        this.cb.onStatus("error", `Agent exited (code ${code ?? "?"})`);
      }
    });

    const input = Writable.toWeb(this.proc.stdin) as WritableStream<Uint8Array>;
    const output = Readable.toWeb(this.proc.stdout) as ReadableStream<Uint8Array>;
    const stream = acp.ndJsonStream(input, output);

    const self = this;
    this.connection = acp
      .client({ name: "switcheroo" })
      .onRequest(acp.methods.client.session.requestPermission, async (ctx) => {
        return self.handlePermission(ctx.params);
      })
      .onRequest(acp.methods.client.fs.readTextFile, async (ctx) => {
        return self.readTextFile(ctx.params);
      })
      .onRequest(acp.methods.client.fs.writeTextFile, async (ctx) => {
        return self.writeTextFile(ctx.params);
      })
      .onRequest("cursor/ask_question", (params: unknown) => params as Record<string, unknown>, async (ctx) => {
        return self.handleAskQuestion(ctx.params);
      })
      .onNotification("cursor/update_todos", (params: unknown) => params, async () => {
        self.pushMaster("plan", "Todos updated");
      })
      .connect(stream);

    const agent = this.connection.agent;

    await agent.request(acp.methods.agent.initialize, {
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities: {
        fs: { readTextFile: true, writeTextFile: true },
        terminal: false,
      },
      clientInfo: { name: "switcheroo", version: "1.0.0" },
    });

    if (preset.authMethodId) {
      try {
        await agent.request(acp.methods.agent.authenticate, {
          methodId: preset.authMethodId,
        });
      } catch (err) {
        console.error("[acp] authenticate failed", err);
        // Continue — some agents are already logged in via CLI
      }
    }

    this.active = await agent.buildSession({ cwd: this.cwd, mcpServers: [] }).start();
    this.sessionId = this.active.sessionId;
    this.cb.onStatus("ready");
    this.pushMaster("status", `${agentLabel(this.agentKind)} session ready`);
  }

  async prompt(text: string): Promise<void> {
    if (!this.active) throw new Error("Session not ready");
    this.cb.onStatus("running");
    this.streamingAssistantId = null;
    this.streamingAssistantText = "";
    this.streamingThoughtId = null;

    const userItem: TranscriptItem = {
      id: randomUUID(),
      role: "user",
      text,
      at: Date.now(),
    };
    this.emitTranscript(userItem);
    this.pushMaster("user", text, userItem.id);

    // Drain updates in parallel with prompt promise
    const pump = this.pumpUpdates();
    try {
      await this.active.prompt(text);
      await pump;
      this.cb.onStatus("ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.cb.onStatus("error", msg);
      this.pushMaster("error", msg);
      throw err;
    }
  }

  private async pumpUpdates(): Promise<void> {
    if (!this.active) return;
    for (;;) {
      const message = await this.active.nextUpdate();
      if (message.kind === "stop") {
        this.pushMaster("status", `Turn ended (${message.stopReason})`);
        this.streamingAssistantId = null;
        this.streamingAssistantText = "";
        this.streamingThoughtId = null;
        return;
      }
      this.handleUpdate(message.update);
    }
  }

  private handleUpdate(update: acp.SessionUpdate): void {
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
          this.emitTranscript(item);
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
          this.cb.onTranscript(item, this.streamingAssistantId);
        }
        break;
      }
      case "agent_thought_chunk": {
        const chunk = contentText(update.content);
        if (!chunk) return;
        if (!this.streamingThoughtId) {
          this.streamingThoughtId = randomUUID();
          this.emitTranscript({
            id: this.streamingThoughtId,
            role: "thought",
            text: chunk,
            at: Date.now(),
          });
        } else {
          this.cb.onTranscript(
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
        this.emitTranscript(item);
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
        this.emitTranscript(item);
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

  async cancel(): Promise<void> {
    if (!this.connection || !this.sessionId) return;
    try {
      await this.connection.agent.notify(acp.methods.agent.session.cancel, {
        sessionId: this.sessionId,
      });
    } catch {
      /* ignore */
    }
  }

  respondPermission(requestId: string, optionId: string | "cancelled"): void {
    const resolve = this.pendingPermissions.get(requestId);
    if (resolve) {
      this.pendingPermissions.delete(requestId);
      resolve(optionId);
    }
  }

  respondAskQuestion(requestId: string, outcome: unknown): void {
    const resolve = this.pendingAsk.get(requestId);
    if (resolve) {
      this.pendingAsk.delete(requestId);
      resolve(outcome);
    }
  }

  private async handlePermission(
    params: acp.RequestPermissionRequest,
  ): Promise<acp.RequestPermissionResponse> {
    const requestId = randomUUID();
    this.pushMaster("permission", params.toolCall?.title ?? "Permission requested");
    this.cb.onPermission({
      requestId,
      tabId: this.tabId,
      toolCallTitle: params.toolCall?.title ?? "Permission requested",
      options: (params.options ?? []).map((o) => ({
        optionId: o.optionId,
        name: o.name,
        kind: o.kind,
      })),
    });

    const optionId = await new Promise<string | "cancelled">((resolve) => {
      this.pendingPermissions.set(requestId, resolve);
    });

    if (optionId === "cancelled") {
      return { outcome: { outcome: "cancelled" } };
    }
    return { outcome: { outcome: "selected", optionId } };
  }

  private async handleAskQuestion(
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const requestId = randomUUID();
    this.pushMaster("permission", "Question from agent");
    this.cb.onAskQuestion({
      requestId,
      tabId: this.tabId,
      toolCallId: String(params.toolCallId ?? ""),
      title: params.title as string | undefined,
      questions: (params.questions as CursorAskQuestionRequestQuestions) ?? [],
    });
    return new Promise((resolve) => {
      this.pendingAsk.set(requestId, resolve);
    });
  }

  private async readTextFile(
    params: acp.ReadTextFileRequest,
  ): Promise<acp.ReadTextFileResponse> {
    const filePath = this.resolvePath(params.path);
    const content = await fs.readFile(filePath, "utf8");
    return { content };
  }

  private async writeTextFile(
    params: acp.WriteTextFileRequest,
  ): Promise<acp.WriteTextFileResponse> {
    const filePath = this.resolvePath(params.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, params.content, "utf8");
    return {};
  }

  resolvePath(p: string): string {
    const resolved = path.isAbsolute(p) ? path.normalize(p) : path.resolve(this.cwd, p);
    const root = path.resolve(this.cwd);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      throw new Error("Path escapes workspace");
    }
    return resolved;
  }

  private emitTranscript(item: TranscriptItem): void {
    this.cb.onTranscript(item);
  }

  private pushMaster(
    kind: MasterEvent["kind"],
    summary: string,
    id?: string,
  ): void {
    if (this.disposed) return;
    this.bus.append({
      id: id ?? randomUUID(),
      tabId: this.tabId,
      agentKind: this.agentKind,
      at: Date.now(),
      kind,
      summary,
      navigable: true,
    });
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    try {
      this.active?.dispose();
    } catch {
      /* ignore */
    }
    this.connection?.close();
    if (this.proc && !this.proc.killed) {
      this.proc.kill();
    }
    this.proc = null;
    this.active = null;
    this.connection = null;
  }
}

type CursorAskQuestionRequestQuestions = Array<{
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  allowMultiple?: boolean;
}>;

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
