import { app } from "electron";
import * as path from "node:path";

export function userDataDir(): string {
  return app.getPath("userData");
}

export function statePath(): string {
  return path.join(userDataDir(), "switcheroo-state.json");
}

export function sessionsDir(): string {
  return path.join(userDataDir(), "sessions");
}

export function sessionTranscriptPath(tabId: string): string {
  return path.join(sessionsDir(), `${tabId}.jsonl`);
}

export function switchboardPath(): string {
  return path.join(userDataDir(), "switchboard.jsonl");
}
