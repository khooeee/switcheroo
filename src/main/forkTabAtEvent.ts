import { randomUUID } from "node:crypto";
import type { SessionTab, TranscriptItem } from "../shared/types";
import { nextForkTitle } from "../shared/nextForkTitle";
import type { AcpSession } from "./acp/session";
import type { GlobalEventBus } from "./events";
import type { SessionCallbacks } from "./acp/SessionCallbacks";

interface ForkTabHost {
  getTab(tabId: string): SessionTab | undefined;
  getTranscript(tabId: string): TranscriptItem[];
  listTitles(): string[];
  ensureSession(tab: SessionTab): Promise<AcpSession>;
  callbacksFor(tab: SessionTab): SessionCallbacks;
  bus(): GlobalEventBus;
  setSession(tabId: string, session: AcpSession): void;
  addTab(tab: SessionTab, transcript: TranscriptItem[]): void;
  setActiveTab(tabId: string): void;
  emitTabs(): void;
  send(channel: string, payload: unknown): void;
  persist(): Promise<void>;
}

/** Create a forked tab whose transcript ends at `eventId`, via ACP session/fork. */
export async function forkTabAtEvent(
  host: ForkTabHost,
  tabId: string,
  eventId: string,
): Promise<SessionTab> {
  const source = host.getTab(tabId);
  if (!source || source.closed) throw new Error("Session not found");

  const items = host.getTranscript(tabId);
  const index = items.findIndex((item) => item.id === eventId);
  if (index < 0) throw new Error("Event not found in this session");
  const clipped = items.slice(0, index + 1).map((item) => ({ ...item }));
  const rewindTo =
    [...clipped].reverse().find((item) => item.role === "assistant")?.id ?? eventId;

  const sourceSession = await host.ensureSession(source);

  const id = randomUUID();
  const tab: SessionTab = {
    id,
    title: nextForkTitle(source.title, host.listTitles()),
    agentKind: source.agentKind,
    cwd: source.cwd,
    sessionId: null,
    status: "connecting",
    error: null,
    createdAt: Date.now(),
    closed: false,
    slashCommands: source.slashCommands ? [...source.slashCommands] : undefined,
  };
  host.addTab(tab, clipped);
  host.setActiveTab(id);
  host.emitTabs();
  host.send("transcript:reset", { tabId: id, items: clipped });

  try {
    const session = await sourceSession.forkSibling(
      id,
      host.bus(),
      host.callbacksFor(tab),
      rewindTo,
    );
    host.setSession(id, session);
    tab.sessionId = session.sessionId;
    tab.status = "ready";
    tab.error = null;
    host.emitTabs();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    tab.status = "error";
    tab.error = msg;
    host.emitTabs();
    throw err;
  }

  await host.persist();
  return tab;
}
