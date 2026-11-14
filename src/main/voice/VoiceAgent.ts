import type { BrowserWindow } from "electron";
import { errorMessage } from "../../shared/errorMessage";
import type { Session } from "../../shared/session";
import type { VoiceConnectionEvent } from "../../shared/voiceConnectionEvent";
import type { VoiceStatus } from "../../shared/voiceStatus";
import type { SessionManager } from "../sessions/SessionManager";
import type { SessionObserver } from "../sessions/SessionObserver";
import { appendVoiceLog } from "./appendVoiceLog";
import { clipText } from "../../shared/clipText";
import { ensureMicAccess } from "./ensureMicAccess";
import { exchangeVoiceSdp } from "./exchangeVoiceSdp";
import { fetchIceServers } from "./fetchIceServers";
import { runVoiceSearch } from "./runVoiceSearch";
import { runVoiceTool } from "./runVoiceTool";
import { VoiceAnnouncer } from "./VoiceAnnouncer";
import { VoiceConversation } from "./VoiceConversation";
import { VoiceIdleTimer } from "./VoiceIdleTimer";
import { voiceKeyStore } from "./voiceKeyStore";
import { voiceLogFeed } from "./voiceLogFeed";
import { voiceNoticeText } from "./voiceNoticeText";
import { VoiceNotices } from "./VoiceNotices";
import { VoiceRendererLink } from "./VoiceRendererLink";
import { VoiceServerEvents } from "./VoiceServerEvents";
import { voiceSessionConfig } from "./voiceSessionConfig";
import type { VoiceToolContext } from "./VoiceToolContext";
import { voiceUserMessage } from "./voiceUserMessage";

type Deps = {
  sessions: SessionManager;
  getWindow: () => BrowserWindow | null;
};
type ServerEvent = Record<string, unknown>;

const MAX_RETRIES = 3;

/**
 * The global voice agent. The renderer owns the WebRTC audio and data channel and relays events;
 * this owns the key, session config, tools, notices and listening state.
 */
export class VoiceAgent {
  private status: VoiceStatus = { state: "off", activity: "idle", error: null };
  private readonly conversation = new VoiceConversation();
  private readonly link: VoiceRendererLink;
  private readonly notices: VoiceNotices;
  private readonly announcer: VoiceAnnouncer;
  private readonly tools: VoiceToolContext;
  private readonly serverEvents: VoiceServerEvents;
  private readonly idle = new VoiceIdleTimer((minutes) => {
    appendVoiceLog("state", { idleMinutes: minutes });
    this.stop();
  });
  private key: string | null = null;
  private channelOpen = false;
  /** Opened at least once since start, so drops reconnect instead of failing. */
  private opened = false;
  private retries = 0;
  private reconnecting = false;

  constructor(private readonly deps: Deps) {
    this.link = new VoiceRendererLink(deps.getWindow);
    voiceLogFeed.subscribe((entry) => this.link.logEntry(entry));
    const connected = () => this.channelOpen && this.status.state === "listening";
    this.notices = new VoiceNotices(
      () => this.status.state !== "off",
      (quietMs) => connected() && this.conversation.isQuiet(quietMs),
      (text) => this.deliverNotice(text),
    );
    this.announcer = new VoiceAnnouncer(deps.sessions, this.notices, () => this.status.state !== "off");
    this.tools = {
      sessions: deps.sessions,
      focus: { sessionId: null, numbered: [] },
      questions: this.announcer.questions,
      startSearch: (query, depth) => {
        if (this.key) runVoiceSearch(this.key, deps.sessions.getSettings().voiceModel, query, depth, this.notices);
      },
      stopVoice: () => this.stop(),
    };
    this.serverEvents = new VoiceServerEvents(this.conversation, {
      setStatus: (patch) => this.setStatus(patch),
      resetIdle: () => this.resetIdle(),
      pokeNotices: () => this.notices.poke(),
      runTool: (event) => this.runTool(event),
    });
  }

  get observer(): SessionObserver {
    return this.announcer;
  }

  /** Speak a due reminder; false while voice is off. */
  announceReminder(message: string, session: Session | undefined): boolean {
    if (this.status.state === "off") return false;
    this.notices.push(voiceNoticeText.reminder(message, session));
    return true;
  }

  getStatus(): VoiceStatus {
    return { ...this.status };
  }

  /** Button and menu: start when off, otherwise stop. */
  async toggle(): Promise<void> {
    if (this.status.state === "off") return this.start();
    this.stop();
  }

  async start(): Promise<void> {
    if (this.status.state !== "off") return;
    this.conversation.reset();
    this.opened = false;
    this.retries = 0;
    await this.connect();
  }

  stop(): void {
    if (this.status.state === "off") return;
    this.link.command({ type: "disconnect" });
    this.channelOpen = false;
    this.key = null;
    this.idle.clear();
    this.notices.clear();
    this.setStatus({ state: "off", activity: "idle", error: null });
    appendVoiceLog("state", { state: "off" });
  }

  /** Renderer's SDP offer → Inworld's answer (the key never leaves main). */
  answer(offer: string): Promise<string> {
    if (!this.key || this.status.state !== "connecting") return Promise.reject(new Error("Voice is not connecting."));
    return exchangeVoiceSdp(this.key, offer);
  }

  handleConnection(event: VoiceConnectionEvent): void {
    if (event.type === "open") return this.onOpen();
    if (this.status.state === "off") return;
    const reason = event.type === "failed" ? event.error : event.type === "ready" ? "The window reloaded." : "The connection closed.";
    void this.reconnect(reason);
  }

  handleServerEvent(event: ServerEvent): void {
    if (this.status.state === "off") return;
    this.serverEvents.handle(event);
  }

  private async connect(): Promise<void> {
    this.channelOpen = false;
    this.setStatus({ state: "connecting", activity: "idle", error: null });
    try {
      const key = await voiceKeyStore.read();
      if (!key) {
        this.link.openSettings();
        throw new Error("Add your Inworld API key in Settings.");
      }
      await ensureMicAccess();
      const iceServers = await fetchIceServers(key);
      if (this.status.state !== "connecting") return;
      this.key = key;
      this.link.command({ type: "connect", iceServers });
    } catch (error) {
      this.fail(errorMessage(error));
    }
  }

  private onOpen(): void {
    if (this.status.state !== "connecting") return;
    const reconnected = this.opened;
    this.channelOpen = true;
    this.opened = true;
    this.retries = 0;
    this.link.send(voiceSessionConfig(this.deps.sessions.getSettings()));
    if (reconnected && this.conversation.history.length) {
      this.link.send(voiceUserMessage(`${VoiceNotices.HEADER} ${voiceNoticeText.reconnected(this.conversation.history)}`));
    }
    this.setStatus({ state: "listening", activity: "idle", error: null });
    this.resetIdle();
    this.serverEvents.listening(reconnected);
    this.notices.poke();
  }

  /** Drops after a successful open retry with backoff; failures before the first open are final. */
  private async reconnect(reason: string): Promise<void> {
    if (this.reconnecting) return;
    appendVoiceLog("error", { error: reason });
    if (!this.opened || this.retries >= MAX_RETRIES) return this.fail(reason);
    this.retries += 1;
    this.reconnecting = true;
    this.channelOpen = false;
    this.link.command({ type: "disconnect" });
    this.setStatus({ state: "connecting", activity: "idle" });
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (this.retries - 1)));
    this.reconnecting = false;
    if (this.status.state !== "connecting") return;
    await this.connect();
  }

  private fail(error: string): void {
    this.stop();
    this.setStatus({ error });
    appendVoiceLog("error", { error, fatal: true });
  }

  private async runTool(event: ServerEvent): Promise<void> {
    const callId = String(event.call_id ?? "");
    const name = String(event.name ?? "");
    const args = String(event.arguments ?? "");
    if (!callId) return;
    const trigger = this.conversation.trigger;
    const output = await runVoiceTool(this.tools, name, args, trigger);
    appendVoiceLog("tool", { name, args: clipText(args, 500), trigger, output: clipText(output, 800) });
    if (!this.channelOpen) return;
    this.link.send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: callId, output } });
  }

  /** Speak queued notices; the response they trigger may not change sessions (runVoiceTool). */
  private deliverNotice(text: string): void {
    this.conversation.trigger = "notice";
    this.conversation.responseStarted();
    this.link.send(voiceUserMessage(text));
    this.link.send({ type: "response.create" });
    appendVoiceLog("notice", { text: clipText(text, 2000) });
  }

  /** Only while listening; connecting and off never time out. */
  private resetIdle(): void {
    if (this.status.state === "listening") this.idle.reset(this.deps.sessions.getSettings().voiceIdleMinutes);
    else this.idle.clear();
  }

  private setStatus(patch: Partial<VoiceStatus>): void {
    const next = { ...this.status, ...patch };
    if (next.state === this.status.state && next.activity === this.status.activity && next.error === this.status.error) return;
    this.status = next;
    this.link.status(this.getStatus());
  }
}
