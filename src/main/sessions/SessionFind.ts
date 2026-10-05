import { runFindInSessions } from "../runFindInSessions";
import type { SessionState } from "./SessionState";

/** Runs history searches; starting or stopping a search cancels the previous one. */
export class SessionFind {
  private generation = 0;

  constructor(private readonly state: SessionState) {}

  /** Start uncapped history search; progress arrives via find:progress / find:done. */
  start(query: string, searchId: number): { searchId: number } {
    const { state } = this;
    const token = ++this.generation;
    const needle = query.trim();
    void runFindInSessions(
      {
        isCurrent: (t) => t === this.generation,
        sessionIds: () => state.sessions.keys(),
        hydratedSource: (sessionId) => {
          if (!state.hydrated.has(sessionId)) return null;
          const session = state.sessions.get(sessionId);
          if (!session) return null;
          return {
            sessionId,
            title: session.title,
            agent: session.agent,
            turns: state.transcripts.get(sessionId) ?? [],
          };
        },
        send: (channel, payload) => state.send(channel, payload),
      },
      searchId,
      token,
      needle,
    );
    return { searchId };
  }

  stop(): void {
    this.generation += 1;
  }
}
