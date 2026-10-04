import { expect, test, vi } from "vitest";

test("questions across sessions and within a session remain answerable until settled", async () => {
  let state: Array<{ requestId: string; sessionId: string }> = [];
  let mounted = false;
  let receive: ((req: { requestId: string; sessionId: string }) => void) | undefined;
  let settle: ((req: { requestId: string }) => void) | undefined;

  vi.resetModules();
  vi.doMock("react", () => ({
    useState: () => [
      state,
      (update: typeof state | ((prev: typeof state) => typeof state)) => {
        state = typeof update === "function" ? update(state) : update;
      },
    ],
    useEffect: (effect: () => void) => {
      if (!mounted) {
        effect();
        mounted = true;
      }
    },
  }));

  vi.stubGlobal("window", {
    switcheroo: {
      onAskQuestion(cb: typeof receive) {
        receive = cb;
        return () => {};
      },
      onQuestionSettled(cb: typeof settle) {
        settle = cb;
        return () => {};
      },
    },
  });

  const { useAgentQuestions } = await import("../src/renderer/features/permissions/useAgentQuestions");
  expect(useAgentQuestions("a")).toBe(null);
  receive!({ requestId: "a1", sessionId: "a" });
  receive!({ requestId: "b1", sessionId: "b" });
  receive!({ requestId: "a2", sessionId: "a" });
  expect(useAgentQuestions("a")!.requestId).toBe("a1");
  expect(useAgentQuestions("b")!.requestId).toBe("b1");
  settle!({ requestId: "a1" });
  expect(useAgentQuestions("a")!.requestId).toBe("a2");
  expect(useAgentQuestions("b")!.requestId).toBe("b1");
  settle!({ requestId: "b1" });
  expect(useAgentQuestions("b")).toBe(null);
});
