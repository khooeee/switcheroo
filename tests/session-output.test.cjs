const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const cache = new Map();
function load(relative) {
  const file = path.resolve(__dirname, "..", relative);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      if (!name.startsWith(".")) return require(name);
      const target = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.js`);
    },
  });
  return exports;
}

const { SessionOutput } = load("src/main/acp/SessionOutput.ts");
const { GlobalEventBus } = load("src/main/events.ts");

function fixture() {
  const items = [];
  const masters = [];
  const bus = new GlobalEventBus();
  const output = new SessionOutput("codex", bus, (item, replaceId) => {
    if (replaceId) {
      const idx = items.findIndex((entry) => entry.id === replaceId);
      if (idx >= 0) {
        items[idx] = item.role === "tool" ? item : {
          ...items[idx],
          text: items[idx].text + item.text,
          at: item.at,
        };
        return;
      }
    }
    items.push(item);
  }, (kind, summary, id) => {
    masters.push({ kind, summary, id });
    bus.append({ id, kind, summary, sessionId: "tab", agentKind: "codex", at: 1, navigable: true });
  });
  return { output, items, masters };
}

function message(text, messageId) {
  return {
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text },
    ...(messageId ? { messageId } : {}),
  };
}

function thought(text) {
  return {
    sessionUpdate: "agent_thought_chunk",
    content: { type: "text", text },
  };
}

function tool(toolCallId = "t1") {
  return {
    sessionUpdate: "tool_call",
    toolCallId,
    title: "Read file",
    kind: "read",
    status: "completed",
  };
}

test("assistant → tool → assistant yields two assistant items with the tool between them", () => {
  const { output, items } = fixture();
  output.handleUpdate(message("I'll check."));
  output.handleUpdate(tool());
  output.handleUpdate(message("Done."));
  assert.deepEqual(items.map((item) => [item.role, item.text]), [
    ["assistant", "I'll check."],
    ["tool", "Read file"],
    ["assistant", "Done."],
  ]);
});

test("assistant → thought → assistant yields two assistants with the thought between them", () => {
  const { output, items } = fixture();
  output.handleUpdate(message("Looking."));
  output.handleUpdate(thought("Hmm."));
  output.handleUpdate(message("Answer."));
  assert.deepEqual(items.map((item) => [item.role, item.text]), [
    ["assistant", "Looking."],
    ["thought", "Hmm."],
    ["assistant", "Answer."],
  ]);
});

test("plan updates do not split a continuous assistant stream", () => {
  const { output, items, masters } = fixture();
  output.handleUpdate(message("Before."));
  output.handleUpdate({ sessionUpdate: "plan" });
  output.handleUpdate(message(" After."));
  assert.deepEqual(items.map((item) => [item.role, item.text]), [
    ["assistant", "Before. After."],
  ]);
  assert.equal(masters.filter((entry) => entry.kind === "plan").length, 1);
});

test("a new messageId starts a new assistant bubble", () => {
  const { output, items } = fixture();
  output.handleUpdate(message("One.", "msg-1"));
  output.handleUpdate(message(" Two.", "msg-2"));
  assert.deepEqual(items.map((item) => [item.id, item.text]), [
    ["msg-1", "One."],
    ["msg-2", " Two."],
  ]);
});
