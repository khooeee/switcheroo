import { randomUUID } from "node:crypto";
import type { FileChange, TranscriptItem, TranscriptTurn } from "../../shared/types";

function aggregateFileChanges(events: TranscriptItem[]): FileChange[] {
  const out: FileChange[] = [];
  for (const event of events) {
    if (event.fileChanges?.length) out.push(...event.fileChanges);
  }
  return out;
}

function cloneTurn(turn: TranscriptTurn): TranscriptTurn {
  return {
    ...turn,
    user: { ...turn.user },
    assistant: turn.assistant ? { ...turn.assistant } : null,
    events: turn.events.map((event) => ({ ...event })),
    fileChanges: turn.fileChanges.map((change) => ({ ...change })),
  };
}

/** Builds TranscriptTurn objects from streaming transcript items for one ACP session. */
export class TurnBuilder {
  private turns: TranscriptTurn[] = [];
  /** Turn currently receiving agent updates. */
  private activeId: string | null = null;

  constructor(private onTurn: (turn: TranscriptTurn) => void) {}

  /** Seed from a hydrated transcript (fork / reopen). */
  restore(turns: TranscriptTurn[]): void {
    this.turns = turns.map(cloneTurn);
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
    delete turn.user.queued;
    this.emit(turn);
  }

  setQueued(userId: string, queued: boolean): void {
    const turn = this.turns.find((entry) => entry.user.id === userId);
    if (!turn) return;
    if (queued) turn.user = { ...turn.user, queued: true };
    else {
      const { queued: _q, ...user } = turn.user;
      turn.user = user;
    }
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
        turn.events[idx] =
          item.role === "tool"
            ? { ...item }
            : { ...prev, text: prev.text + item.text, at: item.at };
        this.refreshFiles(turn);
        this.emit(turn);
        return;
      }
    }

    if (item.role === "assistant") {
      if (turn.assistant) turn.events.push(turn.assistant);
      turn.assistant = { ...item };
      this.emit(turn);
      return;
    }

    turn.events.push({ ...item });
    this.refreshFiles(turn);
    this.emit(turn);
  }

  /** Mark a non-active running turn complete (steer-injected user message). */
  completeIfOrphan(userId: string): void {
    const turn = this.turns.find((entry) => entry.user.id === userId);
    if (!turn || turn.id === this.activeId || turn.status !== "running") return;
    turn.status = "complete";
    this.emit(turn);
  }

  /** Prefer the newest running turn (steer startedNewTurn). */
  activateLatestRunning(): void {
    for (let i = this.turns.length - 1; i >= 0; i -= 1) {
      const turn = this.turns[i]!;
      if (turn.status !== "running") continue;
      this.activeId = turn.id;
      delete turn.user.queued;
      this.emit(turn);
      return;
    }
  }

  complete(): void {
    const turn = this.activeTurn();
    if (!turn || turn.status !== "running") return;
    turn.status = "complete";
    this.activeId = null;
    this.emit(turn);
  }

  stop(stopped: TranscriptItem): void {
    const turn = this.activeTurn();
    if (!turn) return;
    turn.events.push({ ...stopped });
    turn.status = "stopped";
    this.activeId = null;
    this.emit(turn);
  }

  /** Clip turns through eventId for fork. Returns null if eventId is missing. */
  clipThrough(eventId: string): TranscriptTurn[] | null {
    const clipped: TranscriptTurn[] = [];
    for (const turn of this.turns) {
      if (turn.user.id === eventId) {
        clipped.push({
          ...cloneTurn(turn),
          assistant: null,
          events: [],
          fileChanges: [],
          status: turn.status === "running" ? "complete" : turn.status,
        });
        return clipped;
      }
      if (turn.assistant?.id === eventId) {
        const copy = cloneTurn(turn);
        copy.events = [];
        copy.fileChanges = [];
        copy.status = copy.status === "running" ? "complete" : copy.status;
        clipped.push(copy);
        return clipped;
      }
      const eventIdx = turn.events.findIndex((event) => event.id === eventId);
      if (eventIdx >= 0) {
        const copy = cloneTurn(turn);
        const kept = copy.events.slice(0, eventIdx + 1);
        const hit = kept[eventIdx]!;
        copy.events = kept;
        if (copy.assistant && copy.assistant.at > hit.at) copy.assistant = null;
        copy.fileChanges = aggregateFileChanges(copy.events);
        copy.status = copy.status === "running" ? "complete" : copy.status;
        clipped.push(copy);
        return clipped;
      }
      clipped.push(cloneTurn(turn));
    }
    return null;
  }

  private activeTurn(): TranscriptTurn | null {
    if (!this.activeId) return null;
    return this.turns.find((turn) => turn.id === this.activeId) ?? null;
  }

  /** Prefer the in-flight turn; fall back to the latest for late tool updates. */
  private targetTurn(): TranscriptTurn | null {
    return this.activeTurn() ?? this.turns.at(-1) ?? null;
  }

  private refreshFiles(turn: TranscriptTurn): void {
    turn.fileChanges = aggregateFileChanges(turn.events);
  }

  private emit(turn: TranscriptTurn): void {
    this.onTurn(cloneTurn(turn));
  }
}
