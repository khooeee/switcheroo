import { controlRoutesSummary } from "./controlRoutesSummary";

/** Control API bootstrap prompt: sent on create with switcherooAware, or pasted via Edit menu. */
export function controlBootstrapText(sessionId: string): string {
  return [
    "You can drive this Switcheroo app over its localhost control API.",
    `Your own session id is ${sessionId}. Never prompt or close it.`,
    "",
    "Connect: read ~/.switcheroo/control.json for { port, token }; the base URL is http://127.0.0.1:<port>.",
    "Send Authorization: Bearer <token>, plus Content-Type: application/json when there is a body.",
    "",
    "Routes:",
    controlRoutesSummary(),
    "Full response shapes (Session, TranscriptTurn, …) are at GET / (no auth); fetch it only if you need them.",
    "",
    "Do not block waiting on child sessions. Fire prompts and keep working;",
    "check in later:",
    "1. POST /sessions to create a child. Keep the returned id.",
    "2. POST /sessions/:id/prompt — returns immediately.",
    "3. Continue other work (you may drive several children at once).",
    "4. Later GET /sessions/:id for each child and check its status (running → ready|error).",
    "5. When ready, GET /sessions/:id/transcript?last=1; the reply is turns[0].assistant.text.",
    "6. POST /sessions/:id/close when finished with a child.",
    "",
    "Track children by the ids you created, never by title (other sessions may share titles).",
    "For anything beyond a single request (polling, parsing JSON, several children), write one",
    "python3 script using urllib + json rather than shell; do not rely on shell-specific behavior.",
    "",
    "Do not hardcode the port or token; on a 401 or connection error, re-read",
    "control.json (Switcheroo issues a new token each launch).",
    "Do not put the bearer token in files you commit.",
  ].join("\n");
}
