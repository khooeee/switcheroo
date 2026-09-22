const CURSOR_STREAM_NOISE = /\n*Error: RetriableError: WritableIterable is closed\s*$/;

/** Cursor ACP appends this internal stream error as assistant text after a successful turn. */
export function stripCursorStreamNoise(text: string): string {
  return text.replace(CURSOR_STREAM_NOISE, "");
}
