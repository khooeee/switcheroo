import { test, expect } from "vitest";
import { SessionOutput } from "../src/main/acp/SessionOutput";

function fixture() {
  const items: Array<{ id: string; role: string; text: string; at: number }> = [];
  const output = new SessionOutput("codex", (item, replaceId) => {
    if (replaceId) {
      const idx = items.findIndex((entry) => entry.id === replaceId);
      if (idx >= 0) {
        items[idx] =
          item.role === "tool"
            ? item
            : {
                ...items[idx],
                text: items[idx].text + item.text,
                at: item.at,
              };
        return;
      }
    }
    items.push(item);
  });
  return { output, items };
}

function message(text: string, messageId?: string) {
  return {
    sessionUpdate: "agent_message_chunk" as const,
    content: { type: "text" as const, text },
    ...(messageId ? { messageId } : {}),
  };
}

function thought(text: string) {
  return {
    sessionUpdate: "agent_thought_chunk" as const,
    content: { type: "text" as const, text },
  };
}

function tool(toolCallId = "t1") {
  return {
    sessionUpdate: "tool_call" as const,
    toolCallId,
    title: "Read file",
    kind: "read",
    status: "completed" as const,
  };
}

test("assistant → tool → assistant yields two assistant items with the tool between them", () => {
  const { output, items } = fixture();
  output.handleUpdate(message("I'll check."));
  output.handleUpdate(tool());
  output.handleUpdate(message("Done."));
  expect(items.map((item) => [item.role, item.text])).toEqual([
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
  expect(items.map((item) => [item.role, item.text])).toEqual([
    ["assistant", "Looking."],
    ["thought", "Hmm."],
    ["assistant", "Answer."],
  ]);
});

test("plan updates become system items and do not split a continuous assistant stream", () => {
  const { output, items } = fixture();
  output.handleUpdate(message("Before."));
  output.handleUpdate({ sessionUpdate: "plan" });
  output.handleUpdate(message(" After."));
  expect(items.map((item) => [item.role, item.text])).toEqual([
    ["assistant", "Before. After."],
    ["system", "Plan updated"],
  ]);
});

test("a new messageId starts a new assistant bubble", () => {
  const { output, items } = fixture();
  output.handleUpdate(message("One.", "msg-1"));
  output.handleUpdate(message(" Two.", "msg-2"));
  expect(items.map((item) => [item.id, item.text])).toEqual([
    ["msg-1", "One."],
    ["msg-2", " Two."],
  ]);
});
