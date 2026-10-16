import { randomUUID } from "node:crypto";
import type { TranscriptItem, TranscriptTurn } from "../../shared/transcript";
import { finalizeStalledTurns } from "../sessions/finalizeStalledTurns";
import { aggregateFileChanges } from "./aggregateFileChanges";
import { cloneTurn } from "./cloneTurn";

/** The turn's prompt has been sent, so it is no longer waiting in the queue. */
function unqueue(turn: TranscriptTurn): void {
  if (!turn.user.queued) return;
  const { queued: _queued, ...user } = turn.user;
  turn.user = user;
}

/** Builds TranscriptTurn objects from streaming transcript items for one ACP session. */
export class TurnBuilder {
  private turns: TranscriptTurn[] = [];
  /** Turn currently receiving agent updates. */
  private activeId: string | null = null;

  constructor(private onTurn: (turn: TranscriptTurn) => void) {}

  /** Seed from a hydrated transcript (fork / reopen). */
  restore(turns: TranscriptTurn[]): void {
    this.turns = finalizeStalledTurns(turns).map(cloneTurn);
    this.activeId = null;
  }

  list(): TranscriptTurn[] {
    return this.turns.map(cloneTurn);
  }

  open(user: TranscriptItem): TranscriptTurn {
    const turn: TranscriptTurn = {
      id: randomUUID(),
      at: user.at,
      user: { ...user },
      assistant: null,
      events: [],
      fileChanges: [],
      status: "running",
    };
    this.turns.push(turn);
    // Queued follow-ups must not steal the in-flight turn's active slot.
    if (!this.activeId) this.activeId = turn.id;
    this.emit(turn);
    return cloneTurn(turn);
  }

  /** Mark a turn as the one receiving agent updates (when a queued prompt starts). */
  activate(userId: string): void {
    const turn = this.turns.find((entry) => entry.user.id === userId);
    if (!turn) return;
    this.activeId = turn.id;
    turn.status = "running";
    unqueue(turn);
    this.emit(turn);
  }

  setQueued(userId: string, queued: boolean): void {
    const turn = this.turns.find((entry) => entry.user.id === userId);
    if (!turn) return;
    if (queued) turn.user = { ...turn.user, queued: true };
    else unqueue(turn);
    this.emit(turn);
  }

  /** Drop a queued turn that was never sent. */
  discard(userId: string): TranscriptTurn | null {
    const idx = this.turns.findIndex((entry) => entry.user.id === userId);
    if (idx < 0) return null;
    const [removed] = this.turns.splice(idx, 1);
    if (!removed) return null;
    if (this.activeId === removed.id) this.activeId = null;
    return cloneTurn(removed);
  }

  apply(item: TranscriptItem, replaceId?: string): void {
    const turn = this.targetTurn();
    if (!turn) return;

    if (replaceId) {
      if (turn.assistant?.id === replaceId) {
        turn.assistant = {
          ...turn.assistant,
          text: turn.assistant.text + item.text,
          at: item.at,
        };
        this.emit(turn);
        return;
      }
      const idx = turn.events.findIndex((event) => event.id === replaceId);
      if (idx >= 0) {
        const prev = turn.events[idx]!;
        const next =
          item.role === "tool" || item.role === "subagent"
            ? { ...item }
            : { ...prev, text: prev.text + item.text, at: item.at };
        turn.events = turn.events.map((event, i) => (i === idx ? next : event));
        this.refreshFiles(turn);
        this.emit(turn);
        return;
      }
    }

    if (item.role === "assistant") {
      if (turn.assistant) turn.events = [...turn.events, turn.assistant];
      turn.assistant = { ...item };
      this.emit(turn);
      return;
    }

    // Mid-turn user steers should appear after the assistant text so far.
    if (item.role === "user" && turn.assistant) {
      turn.events = [...turn.events, turn.assistant];
      turn.assistant = null;
    }

    turn.events = [...turn.events, { ...item }];
    this.refreshFiles(turn);
    this.emit(turn);
  }

  /** Replace an event in whichever turn holds it (a subagent row can settle after its turn). */
  replaceEvent(item: TranscriptItem): void {
    const turn = this.turns.find((entry) => entry.events.some((event) => event.id === item.id));
    if (!turn) return;
    turn.events = turn.events.map((event) => (event.id === item.id ? { ...item } : event));
    this.emit(turn);
  }

  /** Mark a non-active running turn complete (unused prompt orphan). */
  completeIfOrphan(userId: string): void {
    const turn = this.turns.find((entry) => entry.user.id === userId);
    if (!turn || turn.id === this.activeId || turn.status !== "running") return;
    turn.status = "complete";
    this.emit(turn);
  }

  /** Id of the turn currently receiving agent updates, if any. */
  activeTurnId(): string | null {
    return this.activeId;
  }

  /** Prefer the newest running turn (steer startedNewTurn). */
  activateLatestRunning(): void {
    for (let i = this.turns.length - 1; i >= 0; i -= 1) {
      const turn = this.turns[i]!;
      if (turn.status !== "running") continue;
      this.activeId = turn.id;
      unqueue(turn);
      this.emit(turn);
      return;
    }
  }

  complete(): void {
    const turn = this.activeTurn() ?? this.latestRunning();
    if (!turn || turn.status !== "running") return;
    turn.status = "complete";
    this.activeId = null;
    this.emit(turn);
  }

  stop(stopped: TranscriptItem): void {
    const turn = this.activeTurn();
    if (!turn) return;
    turn.events = [...turn.events, { ...stopped }];
    turn.status = "stopped";
    this.activeId = null;
    this.emit(turn);
  }

  private activeTurn(): TranscriptTurn | null {
    if (!this.activeId) return null;
    return this.turns.find((turn) => turn.id === this.activeId) ?? null;
  }

  /** Newest running turn — used when activeId was cleared or never set (e.g. hydrate). */
  private latestRunning(): TranscriptTurn | null {
    for (let i = this.turns.length - 1; i >= 0; i -= 1) {
      const turn = this.turns[i]!;
      if (turn.status === "running") return turn;
    }
    return null;
  }

  /** Prefer the in-flight turn; fall back to the latest for late tool updates. */
  private targetTurn(): TranscriptTurn | null {
    return this.activeTurn() ?? this.turns.at(-1) ?? null;
  }

  private refreshFiles(turn: TranscriptTurn): void {
    turn.fileChanges = aggregateFileChanges(turn.events);
  }

  /**
   * Shallow-clone the turn for listeners while preserving nested object identity
   * for unchanged events/user/assistant (React.memo structural sharing).
   */
  private emit(turn: TranscriptTurn): void {
    this.onTurn({ ...turn });
  }
}
