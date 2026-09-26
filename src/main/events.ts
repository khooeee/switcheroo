import { EventEmitter } from "node:events";
import type { MasterEvent } from "../shared/types";

const MAX_EVENTS = 2000;

export class GlobalEventBus extends EventEmitter {
  private events: MasterEvent[] = [];

  append(event: MasterEvent): MasterEvent {
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

  updateSummary(id: string, summary: string): void {
    this.updateEvent(id, { summary });
  }

  updateEvent(id: string, patch: Partial<Pick<MasterEvent, "summary" | "toolStatus" | "fileChanges">>): void {
    const event = this.events.find((entry) => entry.id === id);
    if (!event) return;
    Object.assign(event, patch);
    this.emit("event", event);
  }

  list(): MasterEvent[] {
    return [...this.events];
  }

  setSessionTitle(sessionId: string, title: string): MasterEvent[] {
    const updated: MasterEvent[] = [];
    for (const event of this.events) {
      if (event.sessionId !== sessionId || event.sessionTitle === title) continue;
      event.sessionTitle = title;
      updated.push(event);
    }
    return updated;
  }

  restore(events: MasterEvent[]): void {
    this.events = events.slice(-MAX_EVENTS);
  }
}
