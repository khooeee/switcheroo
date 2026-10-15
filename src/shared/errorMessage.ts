/** A thrown value's message, for logs and UI. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
