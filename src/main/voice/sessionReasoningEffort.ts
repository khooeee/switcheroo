type Config = { reasoning?: { effort?: unknown } };
type SessionUpdated = { session?: { text_generation_config?: Config; providerData?: { text_generation_config?: Config } } };

/** Reasoning effort the server reports in `session.updated` (top level or providerData), or null when absent. */
export function sessionReasoningEffort(event: Record<string, unknown>): string | null {
  const session = (event as SessionUpdated).session;
  const effort =
    session?.text_generation_config?.reasoning?.effort ?? session?.providerData?.text_generation_config?.reasoning?.effort;
  return typeof effort === "string" ? effort : null;
}
