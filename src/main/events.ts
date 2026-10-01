import { EventEmitter } from "node:events";
import type { SwitchboardEvent } from "../shared/types";

const MAX_EVENTS = 2000;

export class GlobalEventBus extends EventEmitter {
  private events: SwitchboardEvent[] = [];

  append(event: SwitchboardEvent): SwitchboardEvent {
    const existing = this.events.findIndex((entry) => entry.id === event.id);
    if (existing >= 0) {
      // Keep the original timestamp so Switchboard order stays stable on updates.
      const at = this.events[existing]!.at;
      this.events[existing] = { ...event, at };
      this.emit("event", this.events[existing]);
      return this.events[existing]!;
    }
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }
    this.emit("event", event);
    return event;
  }

  updateEvent(id: string, patch: Partial<Pick<SwitchboardEvent, "summary" | "toolStatus" | "fileChanges">>): void {
    const event = this.events.find((entry) => entry.id === id);
    if (!event) return;
    Object.assign(event, patch);
    this.emit("event", event);
  }

  list(): SwitchboardEvent[] {
    return [...this.events];
  }

  setSessionTitle(sessionId: string, title: string): SwitchboardEvent[] {
    const updated: SwitchboardEvent[] = [];
    for (const event of this.events) {
      if (event.sessionId !== sessionId || event.sessionTitle === title) continue;
      event.sessionTitle = title;
      updated.push(event);
    }
    return updated;
  }

  /** Drop every Switchboard event for a session (e.g. folder gone from disk). */
  removeSession(sessionId: string): void {
    this.events = this.events.filter((event) => event.sessionId !== sessionId);
  }

  /** Remove events with `at` strictly before cutoff. Returns how many were dropped. */
  removeOlderThan(cutoffAt: number): number {
    const before = this.events.length;
    this.events = this.events.filter((event) => event.at >= cutoffAt);
    return before - this.events.length;
  }

  restore(events: SwitchboardEvent[]): void {
    this.events = events.slice(-MAX_EVENTS);
  }
}
