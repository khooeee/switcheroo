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

export function dailyLogDir(): string {
  return path.join(userDataDir(), "daily-log");
}

/** Finished turns for one local day (`YYYY-MM-DD`). */
export function dailyLogPath(date: string): string {
  return path.join(dailyLogDir(), `${date}.jsonl`);
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

/** Inworld API key, encrypted with safeStorage; never sent to the renderer. */
export function voiceKeyPath(): string {
  return path.join(userDataDir(), "inworld-key.enc");
}

/** Control API bearer token, shared by control.json scripts and the paired iOS app. */
export function controlTokenPath(): string {
  return path.join(userDataDir(), "control-token.json");
}

export function voiceLogDir(): string {
  return path.join(userDataDir(), "voice");
}

/** Voice conversation log for one local day (`YYYY-MM-DD`). */
export function voiceLogPath(date: string): string {
  return path.join(voiceLogDir(), `${date}.jsonl`);
}

/** Content-addressed images from tool results, shared by every session. */
export function imagesDir(): string {
  return path.join(userDataDir(), "images");
}

