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

export function sessionDir(tabId: string): string {
  return path.join(sessionsDir(), tabId);
}

export function sessionTranscriptPath(tabId: string): string {
  return path.join(sessionDir(tabId), "transcript.jsonl");
}

export function sessionMetaPath(tabId: string): string {
  return path.join(sessionDir(tabId), "meta.json");
}

export function sessionNotesPath(tabId: string): string {
  return path.join(sessionDir(tabId), "notes.md");
}

export function switchboardPath(): string {
  return path.join(userDataDir(), "switchboard.jsonl");
}
