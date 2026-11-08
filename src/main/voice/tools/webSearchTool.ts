import { toolArgs } from "../toolArgs";
import type { VoiceToolContext } from "../VoiceToolContext";

/** Start a background web search; its answer arrives later as a notice. */
export async function webSearchTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const query = toolArgs.string(args, "query");
  if (!query) return { ok: false, error: "query is required." };
  const depth = toolArgs.string(args, "depth") === "deep" ? "deep" : "quick";
  ctx.startSearch(query, depth);
  return { status: "searching", note: "Say one short, varied filler now. The answer arrives as a notice." };
}
