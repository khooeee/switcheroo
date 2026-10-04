import { test, expect } from "vitest";
import { forkSessionAtEvent } from "../src/main/forkSessionAtEvent";

const item = (id: string, role: "user" | "assistant", text: string) => ({ id, role, text, at: 0 });
const turn = (n: number) => ({
  id: `turn-${n}`,
  at: 0,
  user: item(`user-${n}`, "user", `ask ${n}`),
  assistant: item(`msg_${n}`, "assistant", `reply ${n}`),
  events: [],
  fileChanges: [],
  status: "complete" as const,
});

function host(turns: ReturnType<typeof turn>[]) {
  const calls = { sent: [] as { channel: string; payload: Record<string, unknown> }[], forkPoints: [] as { messageId?: string }[], fresh: [] as string[] };
  const fakeAcp = { sessionId: "agent-2", restoreTurns() {} };
  const source = { id: "s1", title: "Demo", agent: "claude" as const, cwd: "/tmp", agentSessionId: "agent-1", status: "ready" as const, error: null, createdAt: 0 };
  return {
    calls,
    getSession: () => source,
    getTranscript: () => turns,
    listTitles: () => [],
    ensureSession: async (session: typeof source) => {
      if (session !== source) calls.fresh.push(session.id);
      return {
        forkSibling: async (_id: unknown, _cb: unknown, point?: { messageId?: string }) => {
          if (point) calls.forkPoints.push(point);
          return fakeAcp;
        },
        ...fakeAcp,
      };
    },
    forkSupport: () => ({ supportsFork: true, supportsForkAtMessage: true }),
    callbacksFor: () => ({}),
    bus: () => ({}),
    setSession() {},
    addSession() {},
    setActiveSession() {},
    emitSessions() {},
    persist: async () => {},
    send: (channel: string, payload: Record<string, unknown>) => calls.sent.push({ channel, payload }),
  };
}

test("forking on a user message ends history before its turn and drafts the message", async () => {
  const h = host([turn(1), turn(2)]);
  await forkSessionAtEvent(h, "s1", "user-2");
  const reset = h.calls.sent.find((entry) => entry.channel === "transcript:reset")!.payload;
  expect([...reset.turns as { id: string }[]].map((entry) => entry.id)).toEqual(["turn-1"]);
  expect(reset.draft).toBe("ask 2");
  expect(h.calls.forkPoints[0].messageId).toBe("msg_1");
});

test("forking on the first user message starts a fresh agent session", async () => {
  const h = host([turn(1)]);
  await forkSessionAtEvent(h, "s1", "user-1");
  const reset = h.calls.sent.find((entry) => entry.channel === "transcript:reset")!.payload;
  expect(reset.turns).toHaveLength(0);
  expect(reset.draft).toBe("ask 1");
  expect(h.calls.forkPoints).toHaveLength(0);
  expect(h.calls.fresh).toHaveLength(1);
});

test("forking on an assistant reply keeps its turn without a draft", async () => {
  const h = host([turn(1), turn(2)]);
  await forkSessionAtEvent(h, "s1", "msg_1");
  const reset = h.calls.sent.find((entry) => entry.channel === "transcript:reset")!.payload;
  expect([...reset.turns as { id: string }[]].map((entry) => entry.id)).toEqual(["turn-1"]);
  expect(reset.draft).toBeUndefined();
  expect(h.calls.forkPoints[0].messageId).toBe("msg_1");
});
