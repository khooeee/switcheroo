import type { AppSettings } from "../../shared/appSettings";
import instructions from "./voiceInstructions.md?raw";
import { voiceToolDefs } from "./voiceToolDefs";

/** `session.update` sent when the data channel opens: model, voice, turn detection, tools. */
export function voiceSessionConfig(settings: AppSettings) {
  const now = new Date().toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
  return {
    type: "session.update",
    session: {
      type: "realtime",
      model: settings.voiceModel,
      ...(settings.voiceReasoning !== "DEFAULT" && {
        text_generation_config: { reasoning: { effort: settings.voiceReasoning } },
      }),
      instructions: `${instructions}\n\nThe current local date and time is ${now}.`,
      output_modalities: ["audio"],
      audio: {
        input: {
          transcription: { model: "inworld/inworld-stt-1" },
          // Low eagerness: pauses mid-sentence (hands busy at the sink) don't end the turn.
          turn_detection: { type: "semantic_vad", eagerness: "low", create_response: true, interrupt_response: true },
        },
        output: { model: "inworld-tts-2", voice: settings.voiceName },
      },
      tools: voiceToolDefs,
      tool_choice: "auto",
      providerData: {
        stt: { voice_profile: false },
        // Send a turn's leading steering tag with the first TTS chunk only (Inworld's advice for tts-2).
        tts: { steering_handling: "emit_once" },
        memory: { enabled: true },
        responsiveness: { enabled: true },
      },
    },
  };
}
