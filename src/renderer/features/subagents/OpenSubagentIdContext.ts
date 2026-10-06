import { createContext } from "react";

/** Subagent shown in the right rail, so its chip can look pressed without re-rendering every turn. */
export const OpenSubagentIdContext = createContext<string | null>(null);
