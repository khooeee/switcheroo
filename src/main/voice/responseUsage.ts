type Usage = { input_tokens?: unknown; output_tokens?: unknown; output_token_details?: { reasoning_tokens?: unknown } };

function count(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

/**
 * LLM token counts from a `response.done` event (reasoning is null when not reported). Null when no LLM
 * tokens were reported: Inworld zeroes them on filler and tool-call responses, listing only STT/TTS usage.
 */
export function responseUsage(event: Record<string, unknown>) {
  const usage = (event.response as { usage?: Usage } | undefined)?.usage;
  if (!usage || !count(usage.input_tokens)) return null;
  return {
    input: count(usage.input_tokens),
    output: count(usage.output_tokens),
    reasoning: count(usage.output_token_details?.reasoning_tokens),
  };
}
