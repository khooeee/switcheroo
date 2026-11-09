import { ipcMain } from "electron";
import { isRecord } from "../../shared/isRecord";
import type { VoiceConnectionEvent } from "../../shared/voiceConnectionEvent";
import { openVoiceLogFolder } from "../files/openVoiceLogFolder";
import { readRecentVoiceLog } from "./readRecentVoiceLog";
import type { VoiceAgent } from "./VoiceAgent";
import { voiceKeyStore } from "./voiceKeyStore";

/** How many recent entries the Voice Log view loads. */
const VOICE_LOG_LIMIT = 300;

/** Renderer ↔ main voice channels: controls, key, SDP exchange, and the relayed event stream. */
export function registerVoiceIpc(voice: VoiceAgent): void {
  ipcMain.handle("voice:toggle", () => voice.toggle());
  ipcMain.handle("voice:status", () => voice.getStatus());
  ipcMain.handle("voice:keyInfo", () => voiceKeyStore.info());
  ipcMain.handle("voice:setKey", async (_e, key: unknown) => {
    const value = typeof key === "string" ? key.trim() : "";
    await voiceKeyStore.write(value);
    // The mic hides without a key, so don't leave voice running unseen.
    if (!value) voice.stop();
  });
  ipcMain.handle("voice:answer", (_e, offer: unknown) => voice.answer(typeof offer === "string" ? offer : ""));
  ipcMain.handle("fs:openVoiceLogFolder", () => openVoiceLogFolder());
  ipcMain.handle("voice:log", () => readRecentVoiceLog(VOICE_LOG_LIMIT));
  ipcMain.on("voice:connection", (_e, event: unknown) => {
    if (isRecord(event) && typeof event.type === "string") voice.handleConnection(event as VoiceConnectionEvent);
  });
  ipcMain.on("voice:server-event", (_e, event: unknown) => {
    if (isRecord(event)) voice.handleServerEvent(event);
  });
}
