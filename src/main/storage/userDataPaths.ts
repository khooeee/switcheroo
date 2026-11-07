import { app } from "electron";
import * as path from "node:path";

function userDataDir(): string {
  return app.getPath("userData");
}

export function statePath(): string {
  return path.join(userDataDir(), "switcheroo.json");
}

/** User-edited cron list; the app reads it but never writes it (except a starter file). */
export function cronsPath(): string {
  return path.join(userDataDir(), "crons.json");
}

export function activityDir(): string {
  return path.join(userDataDir(), "activity");
}

/** Finished turns for one local day (`YYYY-MM-DD`). */
export function activityLogPath(date: string): string {
  return path.join(activityDir(), `${date}.jsonl`);
}

export function sessionsDir(): string {
  return path.join(userDataDir(), "sessions");
}

function sessionDir(sessionId: string): string {
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

/** Content-addressed images from tool results, shared by every session. */
export function imagesDir(): string {
  return path.join(userDataDir(), "images");
}

