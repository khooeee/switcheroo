import { app } from "electron";
import * as path from "node:path";

function userDataDir(): string {
  return app.getPath("userData");
}

export function statePath(): string {
  return path.join(userDataDir(), "switcheroo.json");
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

export function subagentsDir(sessionId: string): string {
  return path.join(sessionDir(sessionId), "subagents");
}

export function subagentTranscriptPath(sessionId: string, subagentId: string): string {
  return path.join(subagentsDir(sessionId), `${subagentId.replace(/[^\w.-]/g, "_")}.jsonl`);
}

export function sessionMetaPath(sessionId: string): string {
  return path.join(sessionDir(sessionId), "meta.json");
}

export function switchboardPath(): string {
  return path.join(userDataDir(), "switchboard.jsonl");
}
