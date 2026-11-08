import type { BrowserWindow } from "electron";
import type { VoiceCommand } from "../../shared/voiceCommand";
import type { VoiceLogEntry } from "../../shared/voiceLogEntry";
import type { VoiceStatus } from "../../shared/voiceStatus";

/** Main → renderer voice channels; the renderer owns the WebRTC connection. */
export class VoiceRendererLink {
  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  /** A realtime client event for the renderer to put on the data channel. */
  send(event: object): void {
    this.post("voice:client-event", event);
  }

  command(command: VoiceCommand): void {
    this.post("voice:command", command);
  }

  status(status: VoiceStatus): void {
    this.post("voice:status", status);
  }

  logEntry(entry: VoiceLogEntry): void {
    this.post("voice:log-entry", entry);
  }

  openSettings(): void {
    this.post("voice:open-settings");
  }

  private post(channel: string, payload?: unknown): void {
    this.getWindow()?.webContents.send(channel, payload);
  }
}
