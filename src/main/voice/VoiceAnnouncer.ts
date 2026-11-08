import type { CursorAskQuestionRequest } from "../../shared/agentRequests";
import type { Session } from "../../shared/session";
import type { SessionManager } from "../sessions/SessionManager";
import type { SessionObserver } from "../sessions/SessionObserver";
import { voiceNoticeText } from "./voiceNoticeText";
import type { VoiceNotices } from "./VoiceNotices";

/** Turns session events into voice notices, per the `voiceAnnounce` setting. */
export class VoiceAnnouncer implements SessionObserver {
  /** Open agent questions by request id (kept while voice is off too, for get_session). */
  readonly questions = new Map<string, CursorAskQuestionRequest>();
  private readonly voiceStarted = new Set<string>();

  constructor(
    private readonly sessions: SessionManager,
    private readonly notices: VoiceNotices,
    /** Voice is connected (listening or muted), so a notice can be spoken. */
    private readonly connected: () => boolean,
  ) {}

  noteVoiceStarted(sessionId: string): void {
    this.voiceStarted.add(sessionId);
  }

  promptComplete(sessionId: string): boolean {
    const session = this.announceable(sessionId, false);
    if (!session) return false;
    void this.sessions.getTranscript(sessionId).then((turns) => {
      const turn = turns[turns.length - 1];
      if (turn?.status === "complete") this.notices.push(voiceNoticeText.turnFinished(session, turn));
    });
    return true;
  }

  askQuestion(request: CursorAskQuestionRequest): void {
    this.questions.set(request.requestId, request);
    const session = this.announceable(request.sessionId, true);
    if (session) this.notices.push(voiceNoticeText.question(session, request));
  }

  questionSettled(requestId: string): void {
    this.questions.delete(requestId);
  }

  sessionError(sessionId: string, error: string): void {
    const session = this.announceable(sessionId, false);
    if (session) this.notices.push(voiceNoticeText.sessionError(session, error));
  }

  /** Session to announce about, or null; `blocking` events (questions) ignore the voice-started filter. */
  private announceable(sessionId: string, blocking: boolean): Session | null {
    if (!this.connected()) return null;
    const session = this.sessions.getSession(sessionId);
    if (!session || session.cron) return null;
    const mode = this.sessions.getSettings().voiceAnnounce;
    if (mode === "off") return null;
    if (mode === "voice-started" && !blocking && !this.voiceStarted.has(sessionId)) return null;
    return session;
  }
}
