import { EventEmitter } from "node:events";
import type { MasterEvent } from "../shared/types";

const MAX_EVENTS = 2000;

export class GlobalEventBus extends EventEmitter {
  private events: MasterEvent[] = [];

  append(event: MasterEvent): MasterEvent {
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

  removeTab(tabId: string): MasterEvent[] {
    this.events = this.events.filter((event) => event.tabId !== tabId);
    return this.list();
  }

  restore(events: MasterEvent[]): void {
    this.events = events.slice(-MAX_EVENTS);
  }
}
