import type { VoiceToolContext } from "../VoiceToolContext";

/** Turn voice off; it disconnects right away, so nothing more is said. */
export async function stopVoiceTool(ctx: VoiceToolContext): Promise<unknown> {
  ctx.stopVoice();
  return { ok: true };
}
