/** Error text from a realtime `error` event or a failed `response.done`; null when it is neither (or is ignorable). */
export function realtimeErrorMessage(event: Record<string, unknown>): string | null {
  if (event.type === "error") {
    // Inworld's own capacity notice; the session carries on.
    if (event.errorType === "SESSION_RESOURCES_EXHAUSTED") return null;
    const error = event.error as { message?: string } | undefined;
    return error?.message ?? "Unknown realtime error";
  }
  if (event.type === "response.done") {
    const response = event.response as { status?: string; status_details?: { error?: { message?: string } } } | undefined;
    if (response?.status !== "failed") return null;
    return response.status_details?.error?.message ?? "The response failed";
  }
  return null;
}
