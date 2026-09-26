/** Prefer ACP RequestError.data.details over the generic "Internal error" message. */
export function formatAgentError(error: unknown): string {
  if (!error || typeof error !== "object") return stripIpcPrefix(String(error));
  const err = error as { message?: unknown; data?: unknown };
  const data = err.data;
  if (data && typeof data === "object") {
    const details = (data as { details?: unknown }).details;
    if (typeof details === "string" && details.trim()) return details;
  }
  if (typeof err.message === "string" && err.message.trim()) {
    return stripIpcPrefix(err.message);
  }
  return stripIpcPrefix(String(error));
}

function stripIpcPrefix(message: string): string {
  return message.replace(/^Error invoking remote method '[^']+':\s*/u, "");
}
