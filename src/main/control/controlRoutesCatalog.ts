interface CatalogRoute {
  method: string;
  path: string;
  auth: boolean;
  summary: string;
  body?: Record<string, string>;
  query?: Record<string, string>;
  /** A named shape from `types`, or field → description. */
  response: string | Record<string, string>;
  example: string;
}

/** Single source for the GET / route catalog. */
export function controlRoutesCatalog(baseUrl: string): CatalogRoute[] {
  const b = baseUrl.replace(/\/$/, "");
  return [
    {
      method: "GET",
      path: "/",
      auth: false,
      summary: "JSON catalog of routes",
      response: "This catalog: { name, baseUrl, auth, errors, types, routes }",
      example: `curl -s ${b}/`,
    },
    {
      method: "GET",
      path: "/sessions",
      auth: true,
      summary: "List sessions and active session id (check status while children run)",
      response: {
        pinned: "Session[]",
        unpinned: "Session[]",
        activeTabId: "string — focused session/tab id, or \"switchboard\"",
        switchboardTurns: "SwitchboardTurn[] — recent turns across sessions",
      },
      example: `curl -s -H "Authorization: Bearer $TOKEN" ${b}/sessions`,
    },
    {
      method: "POST",
      path: "/sessions",
      auth: true,
      summary: "Create a session",
      body: {
        agent: "claude | codex | cursor | pi | prime",
        cwd: "absolute workspace path",
        title: "optional string",
        switcherooAware: "optional boolean — inject control API bootstrap prompt (later prompts queue behind it)",
        pin: "optional boolean — pin the session at the top of the rail",
      },
      response: "Session",
      example:
        `curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" ` +
        `-d '{"agent":"cursor","cwd":"/path","title":"A"}' ${b}/sessions`,
    },
    {
      method: "GET",
      path: "/sessions/:id",
      auth: true,
      summary: "Get one session (check a child's status without listing all sessions)",
      response: "Session",
      example: `curl -s -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>`,
    },
    {
      method: "POST",
      path: "/sessions/:id/prompt",
      auth: true,
      summary: "Enqueue a prompt; returns { turnId } immediately (does not wait for the turn)",
      body: { text: "prompt string" },
      response: {
        sessionId: "string",
        turnId: "string — TranscriptTurn.id (the in-flight turn when the prompt steers into it)",
        ok: "true",
      },
      example:
        `curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" ` +
        `-d '{"text":"hello"}' ${b}/sessions/<id>/prompt`,
    },
    {
      method: "POST",
      path: "/sessions/:id/rename",
      auth: true,
      summary: "Rename a session",
      body: { title: "new title string" },
      response: { sessionId: "string", title: "string", ok: "true" },
      example:
        `curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" ` +
        `-d '{"title":"My session"}' ${b}/sessions/<id>/rename`,
    },
    {
      method: "POST",
      path: "/sessions/:id/pin",
      auth: true,
      summary: "Pin a session to the top of the rail",
      response: { sessionId: "string", pinned: "true", ok: "true" },
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/pin`,
    },
    {
      method: "POST",
      path: "/sessions/:id/unpin",
      auth: true,
      summary: "Unpin a session",
      response: { sessionId: "string", pinned: "false", ok: "true" },
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/unpin`,
    },
    {
      method: "POST",
      path: "/sessions/:id/cancel",
      auth: true,
      summary: "Cancel the running prompt",
      response: { sessionId: "string", ok: "true" },
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/cancel`,
    },
    {
      method: "POST",
      path: "/sessions/:id/close",
      auth: true,
      summary: "Close the session (keeps history; does not delete)",
      response: { sessionId: "string", ok: "true" },
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/close`,
    },
    {
      method: "GET",
      path: "/sessions/:id/transcript",
      auth: true,
      summary: "Get the session transcript",
      query: { last: "optional — return only the newest N turns (e.g. last=1)" },
      response: { sessionId: "string", turns: "TranscriptTurn[] — oldest first" },
      example: `curl -s -H "Authorization: Bearer $TOKEN" "${b}/sessions/<id>/transcript?last=1"`,
    },
  ];
}
