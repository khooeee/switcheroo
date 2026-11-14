import type { VoiceStatus } from "../../shared/voiceStatus";
import { appendVoiceLog } from "./appendVoiceLog";
import { realtimeErrorMessage } from "./realtimeErrorMessage";
import { responseUsage } from "./responseUsage";
import { sessionReasoningEffort } from "./sessionReasoningEffort";
import type { VoiceConversation } from "./VoiceConversation";

type Host = {
  setStatus: (patch: Partial<VoiceStatus>) => void;
  resetIdle: () => void;
  pokeNotices: () => void;
  runTool: (event: Record<string, unknown>) => Promise<void>;
};

/** Route realtime server events into conversation state, activity, tools and logs. */
export class VoiceServerEvents {
  /** Wait for session.updated before logging the server's reasoning effort. */
  private onLogPending: boolean | null = null;

  constructor(private readonly conversation: VoiceConversation, private readonly host: Host) {}

  listening(reconnected: boolean): void {
    this.onLogPending = reconnected;
  }

  handle(event: Record<string, unknown>): void {
    const c = this.conversation;
    const error = realtimeErrorMessage(event);
    if (error) {
      appendVoiceLog("error", { error });
      this.host.setStatus({ error });
    }
    switch (event.type) {
      case "input_audio_buffer.speech_started":
        // Speech cancels any notice response, so what follows is the user's.
        c.userSpeaking = true;
        c.trigger = "user";
        c.touch();
        return;
      case "input_audio_buffer.speech_stopped":
        c.userSpeaking = false;
        c.touch();
        return;
      case "input_audio_buffer.committed":
        c.trigger = "user";
        this.host.setStatus({ activity: "thinking" });
        return;
      case "conversation.item.input_audio_transcription.completed":
        if (c.heard(event.transcript)) this.host.resetIdle();
        return;
      case "response.created":
        c.responseStarted();
        this.host.setStatus({ activity: "thinking" });
        return;
      case "response.content_part.added":
      case "output_audio_buffer.started":
        this.host.setStatus({ activity: "speaking" });
        return;
      case "output_audio_buffer.stopped":
        c.audioStopped();
        this.host.setStatus({ activity: "idle" });
        this.host.pokeNotices();
        return;
      case "response.output_audio_transcript.done":
        return c.said(event.transcript);
      case "response.done": {
        const usage = responseUsage(event);
        if (usage) appendVoiceLog("usage", usage);
        c.responseEnded();
        this.host.setStatus({ activity: "idle" });
        this.host.pokeNotices();
        return;
      }
      case "response.function_call_arguments.done":
        void this.host.runTool(event);
        return;
      case "session.updated":
        if (this.onLogPending === null) return;
        appendVoiceLog("state", { state: "listening", reconnected: this.onLogPending, reasoning: sessionReasoningEffort(event) ?? "model default" });
        this.onLogPending = null;
        return;
    }
  }
}
