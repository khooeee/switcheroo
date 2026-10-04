import { PassThrough } from "node:stream";
import { vi } from "vitest";

type SteeringResult = { outcome: string };

type FixtureOptions = {
  agent?: string;
  agentCapabilities?: unknown;
  resumeError?: string;
};

const harness = vi.hoisted(() => {
  const state = {
    supported: true as boolean,
    options: {} as FixtureOptions,
    notifications: new Map<string, (msg: { params: unknown }) => void>(),
    handlers: new Map<string, (...args: unknown[]) => unknown>(),
    questions: [] as Array<{ requestId: string }>,
    settled: [] as string[],
    disconnected: null as AbortController | null,
    requests: [] as Array<{ method: string; params: unknown }>,
    turns: [] as Array<(value: unknown) => void>,
    failures: [] as Array<(error: unknown) => void>,
    statuses: [] as string[],
    transcripts: [] as Array<{
      id: string;
      status?: string;
      assistant?: { text?: string } | null;
      events: Array<{ role: string; text?: string; toolStatus?: string }>;
    }>,
    capabilities: [] as boolean[],
    forkSupport: [] as boolean[],
    events: [] as unknown[],
    completions: [] as boolean[],
    cancellations: [] as Array<{ method: string; params: unknown }>,
    steeringResult: { outcome: "injected" } as SteeringResult,
    child: null as {
      pid: number;
      stdin: PassThrough;
      stdout: PassThrough;
      stderr: PassThrough;
      on(): unknown;
      once(): unknown;
      off(): unknown;
      kill(): void;
    } | null,
  };

  function reset(supported: boolean, options: FixtureOptions) {
    state.supported = supported;
    state.options = options;
    state.notifications = new Map();
    state.handlers = new Map();
    state.questions = [];
    state.settled = [];
    state.disconnected = new AbortController();
    state.requests = [];
    state.turns = [];
    state.failures = [];
    state.statuses = [];
    state.transcripts = [];
    state.capabilities = [];
    state.forkSupport = [];
    state.events = [];
    state.completions = [];
    state.cancellations = [];
    state.steeringResult = { outcome: "injected" };
    state.child = {
      pid: 1,
      stdin: new PassThrough(),
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      on() {
        return this;
      },
      once() {
        return this;
      },
      off() {
        return this;
      },
      kill() {},
    };
  }

  return { state, reset };
});

vi.mock("@agentclientprotocol/sdk", () => {
  const builder = {
    onRequest(method: string, ...args: unknown[]) {
      harness.state.handlers.set(method, args.at(-1) as (...args: unknown[]) => unknown);
      return this;
    },
    onNotification(method: string, handler: (msg: { params: unknown }) => void) {
      harness.state.notifications.set(method, handler);
      return this;
    },
    connect() {
      const disconnected = harness.state.disconnected!;
      return {
        signal: disconnected.signal,
        close() {
          disconnected.abort();
        },
        agent: {
          notify: async (method: string, params: unknown) => {
            harness.state.cancellations.push({ method, params });
          },
          request: async (method: string, params: Record<string, unknown>) => {
            harness.state.requests.push({ method, params });
            if (method === "initialize") {
              return {
                _meta: { steering: { supported: harness.state.supported } },
                agentCapabilities: harness.state.options.agentCapabilities,
              };
            }
            if (method === "fork") return { sessionId: "session-2" };
            if (method === "resume") {
              if (harness.state.options.resumeError) throw new Error(harness.state.options.resumeError);
              harness.state.notifications.get("update")?.({
                params: {
                  sessionId: params.sessionId,
                  update: {
                    sessionUpdate: "agent_message_chunk",
                    content: { type: "text", text: "Resumed" },
                  },
                },
              });
              return {};
            }
            if (method === "new") return { sessionId: "session-1" };
            if (method === "prompt") {
              return new Promise((resolve, reject) => {
                harness.state.turns.push(resolve);
                harness.state.failures.push(reject);
              });
            }
            if (method === "_session/steering") return harness.state.steeringResult;
            throw new Error(`Unexpected request ${method}`);
          },
        },
      };
    },
  };

  return {
    PROTOCOL_VERSION: 1,
    client: () => builder,
    ndJsonStream() {},
    methods: {
      agent: {
        initialize: "initialize",
        session: { new: "new", fork: "fork", resume: "resume", prompt: "prompt", cancel: "cancel" },
      },
      client: {
        session: { requestPermission: "permission", update: "update" },
        fs: { readTextFile: "read", writeTextFile: "write" },
      },
    },
  };
});

vi.mock("../src/main/acp/presets", () => ({
  AGENT_PRESETS: {
    codex: { command: "fake", args: [] },
    claude: { command: "fake", args: [] },
  },
  agentLabel: () => "Agent",
}));

vi.mock("../src/main/acp/spawnAgentProcess", () => ({
  spawnAgentProcess: async () => harness.state.child,
}));

import { AcpSession } from "../src/main/acp/session";

export async function fixture(supported = true, options: FixtureOptions = {}) {
  harness.reset(supported, options);
  const agent = (options.agent ?? "codex") as "codex" | "claude" | "cursor" | "pi";
  const { state } = harness;

  const session = new AcpSession("session-1", agent, "/tmp", {
    onPromptComplete: () => state.completions.push(true),
    onStatus: (status) => state.statuses.push(status),
    onTurn: (turn) => state.transcripts.push(turn as (typeof state.transcripts)[number]),
    onTurnRemoved: (turnId) => {
      const idx = state.transcripts.findIndex((entry) => entry.id === turnId);
      if (idx >= 0) state.transcripts.splice(idx, 1);
    },
    onSteeringSupport: (value) => state.capabilities.push(value),
    onForkSupport: (value) => state.forkSupport.push(value),
    onAvailableCommands() {},
    onUsage() {},
    onPermission() {},
    onAskQuestion: (req) => state.questions.push(req),
    onQuestionSettled: (id) => state.settled.push(id),
    getSessionTitle: () => "Demo session",
  });
  await session.start();

  return {
    handlers: state.handlers,
    questions: state.questions,
    settled: state.settled,
    disconnected: state.disconnected!,
    session,
    requests: state.requests,
    turns: state.turns,
    failures: state.failures,
    statuses: state.statuses,
    transcripts: state.transcripts,
    capabilities: state.capabilities,
    forkSupport: state.forkSupport,
    cancellations: state.cancellations,
    events: state.events,
    completions: state.completions,
    setOutcome: (outcome: string) => {
      state.steeringResult = { outcome };
    },
    update: (update: unknown, sessionId = "session-1") =>
      state.notifications.get("update")?.({ params: { sessionId, update } }),
  };
}
