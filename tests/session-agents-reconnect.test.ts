import { expect, test, vi } from "vitest";
// Fixture first: its vi.mock calls must register before SessionAgents loads AcpSession.
import { fixture } from "./session-fixture";
import { SessionAgents } from "../src/main/sessions/SessionAgents";
import type { SessionHydration } from "../src/main/sessions/SessionHydration";
import type { SessionPersistence } from "../src/main/sessions/SessionPersistence";
import type { SessionState } from "../src/main/sessions/SessionState";
import type { Session } from "../src/shared/session";

const item = (id: string, role: "user" | "assistant", text: string) => ({ id, role, text, at: 0 });

function demoSession(): Session {
  return {
    id: "s1",
    title: "Demo",
    agent: "codex",
    cwd: "/tmp",
    agentSessionId: "agent-1",
    status: "ready",
    error: null,
    createdAt: 0,
  } as unknown as Session;
}

function agentsFor(session: Session) {
  const turn = {
    id: "turn-1",
    at: 0,
    user: item("user-1", "user", "hi"),
    assistant: item("msg-1", "assistant", "hello"),
    events: [],
    fileChanges: [],
    status: "complete" as const,
  };
  const state = {
    agents: new Map(),
    sessions: new Map([[session.id, session]]),
    transcripts: new Map([[session.id, [turn]]]),
    bus: { append: vi.fn() },
    askOwners: new Map(),
    forkSupport: { record: () => false },
    send: vi.fn(),
    emitSessions: vi.fn(),
  };
  const persistence = { queuePersist: vi.fn() };
  const hydration = { ensure: async () => session };
  return new SessionAgents(
    state as unknown as SessionState,
    persistence as unknown as SessionPersistence,
    hydration as unknown as SessionHydration,
  );
}

test("resumes the agent session on a fresh process after the ACP connection closes", async () => {
  const f = await fixture(true, { agentCapabilities: { sessionCapabilities: { resume: {} } } });
  const session = demoSession();
  const agents = agentsFor(session);

  const firstConnection = f.nextConnection();
  const first = await agents.ensureSession(session);
  expect(first.sessionId).toBe("agent-1");

  // Something outside Switcheroo kills the agent process / closes its pipe.
  firstConnection.abort();
  expect(first.connectionClosed).toBe(true);

  f.nextConnection();
  const before = f.requests.length;
  const next = await agents.ensureSession(session);

  expect(next).not.toBe(first);
  expect(next.connectionClosed).toBe(false);
  expect(next.sessionId).toBe("agent-1");
  expect(f.requests.slice(before).map((r) => r.method)).toEqual(["initialize", "resume"]);
  expect(f.requests.at(-1)?.params).toMatchObject({ sessionId: "agent-1" });
});

test("keeps a live agent connection", async () => {
  const f = await fixture(true, { agentCapabilities: { sessionCapabilities: { resume: {} } } });
  const session = demoSession();
  const agents = agentsFor(session);

  f.nextConnection();
  const first = await agents.ensureSession(session);
  const before = f.requests.length;

  expect(await agents.ensureSession(session)).toBe(first);
  expect(f.requests.length).toBe(before);
});
