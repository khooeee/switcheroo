import type { CursorAskQuestionRequest } from "../../shared/agentRequests";
import type { Session } from "../../shared/session";
import type { SessionManager } from "../sessions/SessionManager";
import type { SessionObserver } from "../sessions/SessionObserver";
import { voiceNoticeText } from "./voiceNoticeText";
import type { VoiceNotices } from "./VoiceNotices";

/** Turns session events into voice notices (cron sessions never). */
export class VoiceAnnouncer implements SessionObserver {
  /** Open agent questions by request id (kept while voice is off too, for get_session). */
  readonly questions = new Map<string, CursorAskQuestionRequest>();

  constructor(
    private readonly sessions: SessionManager,
    private readonly notices: VoiceNotices,
    /** Voice is on, so a notice can be spoken. */
    private readonly connected: () => boolean,
  ) {}

  promptComplete(sessionId: string): boolean {
    const session = this.announceable(sessionId);
    if (!session) return false;
    void this.sessions.getTranscript(sessionId).then((turns) => {
      const turn = turns[turns.length - 1];
      if (turn?.status === "complete") this.notices.push(voiceNoticeText.turnFinished(session, turn));
    });
    return true;
  }

  askQuestion(request: CursorAskQuestionRequest): void {
    this.questions.set(request.requestId, request);
    const session = this.announceable(request.sessionId);
    if (session) this.notices.push(voiceNoticeText.question(session, request));
  }

  questionSettled(requestId: string): void {
    this.questions.delete(requestId);
  }

  sessionError(sessionId: string, error: string): void {
    const session = this.announceable(sessionId);
    if (session) this.notices.push(voiceNoticeText.sessionError(session, error));
  }

  /** Session to announce about, or null. */
  private announceable(sessionId: string): Session | null {
    if (!this.connected()) return null;
    const session = this.sessions.getSession(sessionId);
    return session && !session.cron ? session : null;
  }
}
