const INWORLD_API = "https://api.inworld.ai";

/** Call the Inworld API with the server-side key; non-2xx responses throw with the body's message. */
export async function inworldRequest(
  key: string,
  path: string,
  init: { method?: string; contentType?: string; body?: string; signal?: AbortSignal } = {},
): Promise<Response> {
  const res = await fetch(`${INWORLD_API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Basic ${key}`,
      ...(init.contentType ? { "Content-Type": init.contentType } : {}),
    },
    body: init.body,
    signal: init.signal,
  });
  if (res.ok) return res;
  const text = await res.text().catch(() => "");
  let message = text.slice(0, 300);
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    message = (typeof parsed.error === "string" ? parsed.error : parsed.error?.message) ?? parsed.message ?? message;
  } catch {
    // Not JSON; keep the raw text.
  }
  if (res.status === 401 || res.status === 403) message = `Inworld rejected the API key (${res.status}). Check it in Voice Settings.`;
  throw new Error(message || `Inworld request failed (${res.status})`);
}
