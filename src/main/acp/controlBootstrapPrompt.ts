/** Prompt text injected when a tab is created with switcherooAware. */
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
    "Typical loop: create a tab → POST .../prompt?wait=1 → GET transcript → POST close.",
    "Do not hardcode the port; re-read control.json after a Switcheroo restart.",
    "Do not put the bearer token in files you commit.",
  ].join("\n");
}
