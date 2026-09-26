const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { PassThrough } = require("node:stream");
const ts = require("typescript");

async function fixture(supported = true, options = {}) {
  const notifications = new Map();
  const handlers = new Map();
  const questions = [];
  const settled = [];
  const disconnected = new AbortController();
  const requests = [];
  const turns = [];
  const failures = [];
  const statuses = [];
  const transcripts = [];
  const capabilities = [];
  const events = [];
  const completions = [];
  const cancellations = [];
  let steeringResult = { outcome: "injected" };
  const agentKind = options.agentKind ?? "codex";
  const connection = {
    signal: disconnected.signal,
    close() { disconnected.abort(); },
    agent: { notify: async (method, params) => { cancellations.push({ method, params }); }, request: async (method, params) => {
      requests.push({ method, params });
      if (method === "initialize") return { _meta: { steering: { supported } } };
      if (method === "fork") return { sessionId: "session-2" };
      if (method === "resume") {
        if (options.resumeError) throw new Error(options.resumeError);
        notifications.get("update")({ params: { sessionId: params.sessionId,
          update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Resumed" } } } });
        return {};
      }
      if (method === "new") return { sessionId: "session-1" };
      if (method === "prompt") return new Promise((resolve, reject) => { turns.push(resolve); failures.push(reject); });
      if (method === "_session/steering") return steeringResult;
      throw new Error(`Unexpected request ${method}`);
    } },
  };
  const builder = {
    onRequest(method, ...args) { handlers.set(method, args.at(-1)); return this; },
    onNotification(method, handler) { notifications.set(method, handler); return this; },
    connect() { return connection; },
  };
  const acp = {
    PROTOCOL_VERSION: 1, client: () => builder, ndJsonStream() {},
    methods: {
      agent: { initialize: "initialize", session: { new: "new", fork: "fork", resume: "resume", prompt: "prompt", cancel: "cancel" } },
      client: { session: { requestPermission: "permission", update: "update" },
        fs: { readTextFile: "read", writeTextFile: "write" } },
    },
  };
  const child = { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(),
    on() {}, kill() {} };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const source = fs.readFileSync(file, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    vm.runInNewContext(outputText, { exports, process, console, require: (name) => {
      if (name === "@agentclientprotocol/sdk") return acp;
      if (name === "node:child_process") return { spawn: () => child };
      if (name === "./presets") return {
        AGENT_PRESETS: {
          codex: { command: "fake", args: [] },
          claude: { command: "fake", args: [] },
        },
        agentLabel: () => "Agent",
      };
      if (name.startsWith(".")) return load(path.resolve(path.dirname(file), `${name}.ts`));
      return require(name);
    } });
    return exports;
  }
  const { AcpSession } = load(path.join(__dirname, "../src/main/acp/session.ts"));
  const session = new AcpSession("tab-1", agentKind, "/tmp", { append(event) { events.push(event); }, updateSummary() {}, updateEvent() {} }, {
    onPromptComplete: () => completions.push(true),
    onStatus: (status) => statuses.push(status),
    onTranscript: (item) => transcripts.push(item),
    onSteeringSupport: (value) => capabilities.push(value),
    onPermission() {}, onAskQuestion: (req) => questions.push(req),
    onQuestionSettled: (id) => settled.push(id),
  });
  await session.start();
  return {
    handlers, questions, settled, disconnected,
    session, requests, turns, failures, statuses, transcripts, capabilities, cancellations, events, completions,
    setOutcome: (outcome) => { steeringResult = { outcome }; },
    update: (update, sessionId = "session-1") => notifications.get("update")({ params: { sessionId, update } }),
  };
}
module.exports = { fixture };
