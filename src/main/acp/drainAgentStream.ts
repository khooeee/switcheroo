/** Drain a child stdio stream so the agent cannot block; never write to process.stderr. */
export function drainAgentStream(stream: NodeJS.ReadableStream): void {
  stream.on("error", () => undefined);
  stream.on("data", () => undefined);
}
