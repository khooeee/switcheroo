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

export function sessionDir(sessionId: string): string {
  return path.join(sessionsDir(), sessionId);
}

export function sessionTranscriptPath(sessionId: string): string {
  return path.join(sessionDir(sessionId), "transcript.jsonl");
}

export function sessionMetaPath(sessionId: string): string {
  return path.join(sessionDir(sessionId), "meta.json");
}

export function sessionNotesPath(sessionId: string): string {
  return path.join(sessionDir(sessionId), "notes.md");
}

export function switchboardPath(): string {
  return path.join(userDataDir(), "switchboard.jsonl");
}
