import type { VoiceToolContext } from "../VoiceToolContext";

/** Mute the mic; announcements still play. */
export async function sleepTool(ctx: VoiceToolContext): Promise<unknown> {
  ctx.mute();
  return { ok: true, note: "Mic muted. Say a two-word goodbye at most." };
}
