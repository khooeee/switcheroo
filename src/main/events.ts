import { EventEmitter } from "node:events";
import type { SwitchboardTurn } from "../shared/types";

const MAX_TURNS = 2000;

export class GlobalEventBus extends EventEmitter {
  private turns: SwitchboardTurn[] = [];

  append(turn: SwitchboardTurn): SwitchboardTurn {
    const existing = this.turns.findIndex((entry) => entry.id === turn.id);
    if (existing >= 0) {
      // Keep the original timestamp so Switchboard order stays stable on updates.
      const at = this.turns[existing]!.at;
      this.turns[existing] = { ...turn, at };
      this.emit("turn", this.turns[existing]);
      return this.turns[existing]!;
    }
    this.turns.push(turn);
    if (this.turns.length > MAX_TURNS) {
      this.turns = this.turns.slice(-MAX_TURNS);
    }
    this.emit("turn", turn);
    return turn;
  }

  list(): SwitchboardTurn[] {
    return [...this.turns];
  }

  setSessionTitle(sessionId: string, title: string): SwitchboardTurn[] {
    const updated: SwitchboardTurn[] = [];
    for (const turn of this.turns) {
      if (turn.sessionId !== sessionId || turn.sessionTitle === title) continue;
      turn.sessionTitle = title;
      updated.push(turn);
    }
    return updated;
  }

  /** Drop every Switchboard turn for a session (e.g. folder gone from disk). */
  removeSession(sessionId: string): void {
    this.turns = this.turns.filter((turn) => turn.sessionId !== sessionId);
  }

  /** Remove turns with `at` strictly before cutoff. Returns how many were dropped. */
  removeOlderThan(cutoffAt: number): number {
    const before = this.turns.length;
    this.turns = this.turns.filter((turn) => turn.at >= cutoffAt);
    return before - this.turns.length;
  }

  restore(turns: SwitchboardTurn[]): void {
    this.turns = turns.slice(-MAX_TURNS);
  }
}
