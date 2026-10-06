import { createContext } from "react";

/** Opens (or toggles) a subagent transcript in the right rail; stable so memoized rows can read it. */
export const SubagentOpenContext = createContext<(sessionId: string, subagentId: string) => void>(
  () => undefined,
);
