import { randomUUID } from "node:crypto";
import type * as acp from "@agentclientprotocol/sdk";
import type { AgentKind } from "../../../shared/agentKind";
import type { TranscriptItem, TranscriptTurn } from "../../../shared/transcript";
import { SessionOutput } from "../SessionOutput";
import { TurnBuilder } from "../TurnBuilder";
import type { SubagentUpdate } from "./SubagentUpdate";

type Spawned = Extract<SubagentUpdate, { sessionUpdate: "subagent_spawned" }>;

type Subagent = {
  id: string;
  turns: TurnBuilder;
  output: SessionOutput;
  live: boolean;
  /** This subagent's row in its parent's transcript (root session or another subagent). */
  row: TranscriptItem | null;
  rowParent: TurnBuilder | null;
  rowTurnId: string | null;
};

/** A resumed subagent reports `<id>:generation:<n>`; Switcheroo keeps one transcript per id. */
function subagentIdOf(subagentSessionId: string): string {
  return subagentSessionId.replace(/:generation:\d+$/, "");
}

/**
 * Native ACP subagent sessions under one root session (draft RFD #1992).
 * Each subagent streams into its own transcript; its parent transcript gets a `subagent` row
 * whose `toolStatus` tracks running → completed / failed / cancelled.
 */
export class SubagentSessions {
  /** ACP session id → subagent (every resumed generation has its own session id). */
  private bySession = new Map<string, Subagent>();
  private byId = new Map<string, Subagent>();

  constructor(
    private readonly agent: AgentKind,
    private readonly rootTurns: TurnBuilder,
    private readonly onTurn: (subagentId: string, turn: TranscriptTurn) => void,
    private readonly onSession: (subagentSessionId: string) => void,
  ) {}

  owns(sessionId: string): boolean {
    return this.bySession.has(sessionId);
  }

  sessionIds(): string[] {
    return [...this.bySession.keys()];
  }

  /** Messages, thoughts and tool calls streamed by a subagent session. */
  handleUpdate(sessionId: string, update: acp.SessionUpdate): void {
    this.bySession.get(sessionId)?.output.handleUpdate(update);
  }

  /** `parentSessionId` is the session that started the subagent: the root or another subagent. */
  handleLifecycle(parentSessionId: string, update: SubagentUpdate): void {
    if (update.sessionUpdate === "subagent_spawned") {
      this.spawn(parentSessionId, update);
      return;
    }
    const subagent = this.bySession.get(update.subagentSessionId);
    if (subagent) this.settle(subagent, update.state);
  }

  /** The agent connection ended: nothing still running will report back. */
  finish(): void {
    for (const subagent of this.byId.values()) this.settle(subagent, "cancelled");
  }

  private spawn(parentSessionId: string, update: Spawned): void {
    const id = subagentIdOf(update.subagentSessionId);
    const subagent = this.byId.get(id) ?? this.create(id);
    this.bySession.set(update.subagentSessionId, subagent);
    this.onSession(update.subagentSessionId);
    subagent.live = true;
    const at = Date.now();
    const name = update.name?.trim() || "Subagent";
    const task = update.task?.trim() || undefined;
    subagent.turns.open({ id: randomUUID(), role: "user", text: update.prompt?.trim() || task || name, at });
    const parent = this.bySession.get(parentSessionId)?.turns ?? this.rootTurns;
    const turnId = parent.activeTurnId();
    // A subagent resumed within the same parent turn keeps one row.
    const reuse = !!subagent.row && subagent.rowParent === parent && subagent.rowTurnId === turnId;
    const row: TranscriptItem = {
      id: reuse ? subagent.row!.id : randomUUID(),
      role: "subagent",
      text: name,
      toolTitle: task,
      toolStatus: "running",
      subagentId: id,
      at: reuse ? subagent.row!.at : at,
    };
    if (reuse) parent.replaceEvent(row);
    else parent.apply(row);
    subagent.row = row;
    subagent.rowParent = parent;
    subagent.rowTurnId = turnId;
  }

  private create(id: string): Subagent {
    const turns = new TurnBuilder((turn) => this.onTurn(id, turn));
    const subagent: Subagent = {
      id,
      turns,
      output: new SessionOutput(this.agent, (item, replaceId) => turns.apply(item, replaceId)),
      live: false,
      row: null,
      rowParent: null,
      rowTurnId: null,
    };
    this.byId.set(id, subagent);
    return subagent;
  }

  private settle(subagent: Subagent, state: string): void {
    if (!subagent.live) return;
    subagent.live = false;
    subagent.output.finish(state);
    subagent.output.reset();
    if (state === "cancelled" || state === "disconnected") {
      subagent.turns.stop({ id: randomUUID(), role: "stopped", text: "Stopped", at: Date.now() });
    } else {
      subagent.turns.complete();
    }
    if (!subagent.row) return;
    subagent.row = { ...subagent.row, toolStatus: state };
    subagent.rowParent?.replaceEvent(subagent.row);
  }
}
