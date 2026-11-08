import { appendVoiceLog } from "./appendVoiceLog";

const HISTORY_LINES = 8;
/** A response that never reported done stops blocking notices after this long. */
const STALE_RESPONSE_MS = 45_000;
/** Rough TTS pace, to guess when speech that outlives `response.done` ends. */
const CHARS_PER_SECOND = 14;

/** Who is talking and what triggered the current response, from realtime server events; logs what was said. */
export class VoiceConversation {
  userSpeaking = false;
  /** What the response in flight answers: the user's speech, or a Switcheroo notice. */
  trigger: "user" | "notice" = "user";
  /** Recent heard/said lines, replayed into a new call after a reconnect. */
  readonly history: string[] = [];
  private responseSince: number | null = null;
  private speakingUntil = 0;
  private lastChange = Date.now();

  reset(): void {
    this.userSpeaking = false;
    this.trigger = "user";
    this.history.length = 0;
    this.responseSince = null;
    this.speakingUntil = 0;
    this.touch();
  }

  touch(): void {
    this.lastChange = Date.now();
  }

  responseStarted(): void {
    this.responseSince = Date.now();
    this.touch();
  }

  responseEnded(): void {
    this.responseSince = null;
    this.touch();
  }

  /** The agent said `text`; its audio may keep playing after the response is done. */
  said(transcript: unknown): void {
    const text = String(transcript ?? "").trim();
    if (!text) return;
    this.remember(`You: ${text}`);
    this.speakingUntil = Math.max(this.speakingUntil, Date.now() + (text.length / CHARS_PER_SECOND) * 1000);
    appendVoiceLog("said", { text });
  }

  /** The user's words were transcribed; false when the transcript was empty (noise). */
  heard(transcript: unknown): boolean {
    const text = String(transcript ?? "").trim();
    if (!text) return false;
    this.trigger = "user";
    this.remember(`User: ${text}`);
    appendVoiceLog("heard", { text });
    return true;
  }

  /** The server reported its audio finished playing. */
  audioStopped(): void {
    this.speakingUntil = 0;
    this.touch();
  }

  isQuiet(quietMs: number): boolean {
    const now = Date.now();
    const responding = this.responseSince !== null && now - this.responseSince < STALE_RESPONSE_MS;
    return !this.userSpeaking && !responding && now >= this.speakingUntil && now - this.lastChange >= quietMs;
  }

  private remember(line: string): void {
    this.history.push(line.length > 300 ? `${line.slice(0, 299)}…` : line);
    if (this.history.length > HISTORY_LINES) this.history.splice(0, this.history.length - HISTORY_LINES);
  }
}
