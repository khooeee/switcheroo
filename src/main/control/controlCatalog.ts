export interface CatalogRoute {
  method: string;
  path: string;
  auth: boolean;
  summary: string;
  body?: Record<string, string>;
  query?: Record<string, string>;
  example: string;
}

/** Single source for GET / and OpenAPI path list. */
export function controlRoutesCatalog(baseUrl: string): CatalogRoute[] {
  const b = baseUrl.replace(/\/$/, "");
  return [
    {
      method: "GET",
      path: "/",
      auth: false,
      summary: "JSON catalog of routes",
      example: `curl -s ${b}/`,
    },
    {
      method: "GET",
      path: "/openapi.json",
      auth: false,
      summary: "OpenAPI 3 document for the same routes",
      example: `curl -s ${b}/openapi.json`,
    },
    {
      method: "GET",
      path: "/sessions",
      auth: true,
      summary: "List sessions and active session id (check status while children run)",
      example: `curl -s -H "Authorization: Bearer $TOKEN" ${b}/sessions`,
    },
    {
      method: "POST",
      path: "/sessions",
      auth: true,
      summary: "Create a session",
      body: {
        agent: "claude | codex | cursor | pi",
        cwd: "absolute workspace path",
        title: "optional string",
        switcherooAware: "optional boolean — inject control API bootstrap prompt",
        pin: "optional boolean — pin the session at the top of the rail",
      },
      example:
        `curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" ` +
        `-d '{"agent":"cursor","cwd":"/path","title":"A"}' ${b}/sessions`,
    },
    {
      method: "POST",
      path: "/sessions/:id/prompt",
      auth: true,
      summary: "Enqueue a prompt; returns { turnId } immediately (does not wait for the turn)",
      body: { text: "prompt string" },
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
      example:
        `curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" ` +
        `-d '{"title":"My session"}' ${b}/sessions/<id>/rename`,
    },
    {
      method: "POST",
      path: "/sessions/:id/pin",
      auth: true,
      summary: "Pin a session to the top of the rail",
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/pin`,
    },
    {
      method: "POST",
      path: "/sessions/:id/unpin",
      auth: true,
      summary: "Unpin a session",
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/unpin`,
    },
    {
      method: "POST",
      path: "/sessions/:id/cancel",
      auth: true,
      summary: "Cancel the running prompt",
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/cancel`,
    },
    {
      method: "POST",
      path: "/sessions/:id/close",
      auth: true,
      summary: "Close the session (keeps history; does not delete)",
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/sessions/<id>/close`,
    },
    {
      method: "GET",
      path: "/sessions/:id/transcript",
      auth: true,
      summary: "Get the session transcript",
      query: { last: "optional — return only the newest N turns (e.g. last=1)" },
      example: `curl -s -H "Authorization: Bearer $TOKEN" "${b}/sessions/<id>/transcript?last=1"`,
    },
  ];
}

export function controlCatalogJson(baseUrl: string, tokenHint: string) {
  return {
    name: "switcheroo-control",
    baseUrl,
    auth: {
      type: "bearer",
      header: "Authorization: Bearer <token>",
      tokenFrom: "~/.switcheroo/control.json",
      note: tokenHint,
    },
    routes: controlRoutesCatalog(baseUrl),
  };
}

export function controlOpenApi(baseUrl: string) {
  const routes = controlRoutesCatalog(baseUrl);
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of routes) {
    if (route.path === "/" || route.path === "/openapi.json") continue;
    const pathKey = route.path.replace(/:id/g, "{id}");
    const method = route.method.toLowerCase();
    paths[pathKey] ??= {};
    paths[pathKey][method] = {
      summary: route.summary,
      security: route.auth ? [{ bearerAuth: [] }] : [],
      parameters: [
        ...(route.path.includes(":id")
          ? [{ name: "id", in: "path", required: true, schema: { type: "string" } }]
          : []),
        ...Object.entries(route.query ?? {}).map(([name, description]) => ({
          name,
          in: "query",
          description,
          schema: { type: "string" },
        })),
      ],
      ...(route.body
        ? {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: Object.fromEntries(
                      Object.entries(route.body).map(([k, description]) => [
                        k,
                        { type: "string", description },
                      ]),
                    ),
                  },
                },
              },
            },
          }
        : {}),
      responses: { "200": { description: "OK" } },
    };
  }
  return {
    openapi: "3.0.3",
    info: { title: "Switcheroo control API", version: "1.0.0" },
    servers: [{ url: baseUrl.replace(/\/$/, "") }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
      },
    },
    paths,
  };
}
