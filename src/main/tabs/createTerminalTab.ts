import { randomUUID } from "node:crypto";
import type { SessionTab } from "../../shared/session";
import { nextTerminalTitle } from "./nextTerminalTitle";

export function createTerminalTab(cwd: string, existing: SessionTab[]): SessionTab {
  return {
    tabId: randomUUID(),
    kind: "terminal",
    title: nextTerminalTitle(existing),
    cwd,
  };
}
