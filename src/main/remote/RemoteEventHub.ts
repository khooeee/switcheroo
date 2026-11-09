import type { IncomingMessage, ServerResponse } from "node:http";
import type { TranscriptTurn } from "../../shared/transcript";
import type { SessionManager } from "../sessions/SessionManager";
import { remoteSessionList } from "./remoteSessionList";
import { toRemoteTurn } from "./toRemoteTurn";
import { SseStream } from "./SseStream";

/** Rail updates come in bursts (status, usage, bumps); one per window is plenty for a phone. */
const LIST_THROTTLE_MS = 300;
/** Streaming turns resend the whole turn per chunk; coalesce to the newest. */
const TURN_THROTTLE_MS = 150;
/** Turns sent when a transcript stream opens. */
const RESET_TURNS = 50;

/** Fans session list and transcript updates out to iOS event streams, slimmed and throttled. */
export class RemoteEventHub {
  private listStreams = new Set<SseStream>();
  private transcriptStreams = new Map<string, Set<SseStream>>();
  private pendingTurns = new Map<string, Map<string, TranscriptTurn>>();
  private listTimer: NodeJS.Timeout | null = null;
  private turnTimers = new Map<string, NodeJS.Timeout>();

  constructor(private sessions: SessionManager) {
    sessions.subscribe((channel, payload) => this.onEvent(channel, payload));
  }

  /** `GET /events`: the rail now, then on every change. */
  openList(req: IncomingMessage, res: ServerResponse): void {
    const stream = new SseStream(req, res, () => this.listStreams.delete(stream));
    this.listStreams.add(stream);
    stream.send("sessions", remoteSessionList(this.sessions.list()));
  }

  /** `GET /sessions/:id/events`: recent turns now, then each turn as it streams. */
  async openTranscript(sessionId: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    const streams = this.transcriptStreams.get(sessionId) ?? new Set<SseStream>();
    const stream = new SseStream(req, res, () => {
      streams.delete(stream);
      if (streams.size === 0) this.transcriptStreams.delete(sessionId);
    });
    // Join before loading so no turn lands between the load and the reset.
    streams.add(stream);
    this.transcriptStreams.set(sessionId, streams);
    try {
      const turns = await this.sessions.getTranscript(sessionId);
      stream.send("reset", { sessionId, turns: turns.slice(-RESET_TURNS).map(toRemoteTurn) });
    } catch (error) {
      console.warn(`[remote] transcript ${sessionId} failed:`, error);
      stream.close();
    }
  }

  closeAll(): void {
    for (const stream of this.listStreams) stream.close();
    for (const streams of this.transcriptStreams.values()) for (const stream of streams) stream.close();
  }

  private onEvent(channel: string, payload: unknown): void {
    if (channel === "sessions:changed") this.queueList();
    if (channel === "transcript") {
      const { sessionId, turn } = payload as { sessionId: string; turn: TranscriptTurn };
      this.queueTurn(sessionId, turn);
    }
    if (channel === "transcript:reset") {
      const { sessionId, turns } = payload as { sessionId: string; turns: TranscriptTurn[] };
      this.pendingTurns.delete(sessionId);
      this.broadcast(sessionId, "reset", { sessionId, turns: turns.slice(-RESET_TURNS).map(toRemoteTurn) });
    }
  }

  private queueList(): void {
    if (this.listStreams.size === 0 || this.listTimer) return;
    this.listTimer = setTimeout(() => {
      this.listTimer = null;
      const list = remoteSessionList(this.sessions.list());
      for (const stream of this.listStreams) stream.send("sessions", list);
    }, LIST_THROTTLE_MS);
  }

  private queueTurn(sessionId: string, turn: TranscriptTurn): void {
    if (!this.transcriptStreams.has(sessionId)) return;
    const pending = this.pendingTurns.get(sessionId) ?? new Map<string, TranscriptTurn>();
    pending.set(turn.id, turn);
    this.pendingTurns.set(sessionId, pending);
    // A finished turn goes out now so the phone never shows a stale "running".
    if (turn.status !== "running") return this.flushTurns(sessionId);
    if (this.turnTimers.has(sessionId)) return;
    this.turnTimers.set(sessionId, setTimeout(() => this.flushTurns(sessionId), TURN_THROTTLE_MS));
  }

  private flushTurns(sessionId: string): void {
    clearTimeout(this.turnTimers.get(sessionId));
    this.turnTimers.delete(sessionId);
    const pending = this.pendingTurns.get(sessionId);
    this.pendingTurns.delete(sessionId);
    for (const turn of pending?.values() ?? []) {
      this.broadcast(sessionId, "turn", { sessionId, turn: toRemoteTurn(turn) });
    }
  }

  private broadcast(sessionId: string, event: string, payload: unknown): void {
    for (const stream of this.transcriptStreams.get(sessionId) ?? []) stream.send(event, payload);
  }
}
