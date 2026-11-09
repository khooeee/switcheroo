import type { IncomingMessage, ServerResponse } from "node:http";

/** iOS times a request out after 60s without bytes, so ping well inside that. */
const PING_MS = 20_000;

/** One open text/event-stream response; every event is a single `data:` line of JSON. */
export class SseStream {
  private ping: NodeJS.Timeout;

  constructor(req: IncomingMessage, private res: ServerResponse, onClose: () => void) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.flushHeaders();
    this.ping = setInterval(() => res.write(": ping\n\n"), PING_MS);
    req.on("close", () => {
      clearInterval(this.ping);
      onClose();
    });
  }

  send(event: string, payload: unknown): void {
    this.res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  }

  close(): void {
    clearInterval(this.ping);
    this.res.end();
  }
}
