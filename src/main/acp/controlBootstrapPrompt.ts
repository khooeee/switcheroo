/** Prompt text injected when a session is created with switcherooAware. */
export function controlBootstrapText(): string {
  return [
    "You can drive this Switcheroo app over its localhost control API.",
    "",
    "Connect:",
    "1. Read ~/.switcheroo/control.json for { port, token, spec }.",
    "2. Discover routes with: curl -s \"$spec\"  (GET /, no auth).",
    "3. For all other routes send Authorization: Bearer <token>",
    "   and Content-Type: application/json when there is a body.",
    "",
    "Do not block waiting on child sessions. Fire prompts and keep working;",
    "check in later:",
    "1. POST /sessions to create a child (agent + cwd required).",
    "2. POST /sessions/:id/prompt with {\"text\":\"...\"} — returns { turnId } immediately.",
    "3. Continue other work (you may drive several children at once).",
    "4. Later GET /sessions and check each child's status (running → ready|error).",
    "5. When ready, GET /sessions/:id/transcript?last=1 for the newest turn.",
    "6. POST /sessions/:id/close when finished with a child.",
    "",
    "Do not hardcode the port; re-read control.json after a Switcheroo restart.",
    "Do not put the bearer token in files you commit.",
  ].join("\n");
}
