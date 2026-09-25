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
      path: "/tabs",
      auth: true,
      summary: "List tabs and active tab id",
      example: `curl -s -H "Authorization: Bearer $TOKEN" ${b}/tabs`,
    },
    {
      method: "POST",
      path: "/tabs",
      auth: true,
      summary: "Create a tab",
      body: {
        agentKind: "claude | codex | cursor | pi",
        cwd: "absolute workspace path",
        title: "optional string",
        switcherooAware: "optional boolean — inject control API bootstrap prompt",
      },
      example:
        `curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" ` +
        `-d '{"agentKind":"cursor","cwd":"/path","title":"A"}' ${b}/tabs`,
    },
    {
      method: "POST",
      path: "/tabs/:id/prompt",
      auth: true,
      summary: "Send a prompt; ?wait=1 blocks until the turn completes",
      body: { text: "prompt string" },
      query: { wait: "1 to wait for turn complete" },
      example:
        `curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" ` +
        `-d '{"text":"hello"}' "${b}/tabs/<id>/prompt?wait=1"`,
    },
    {
      method: "POST",
      path: "/tabs/:id/cancel",
      auth: true,
      summary: "Cancel the running prompt",
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/tabs/<id>/cancel`,
    },
    {
      method: "POST",
      path: "/tabs/:id/close",
      auth: true,
      summary: "Close the tab (keeps history; does not delete)",
      example: `curl -s -X POST -H "Authorization: Bearer $TOKEN" ${b}/tabs/<id>/close`,
    },
    {
      method: "GET",
      path: "/tabs/:id/transcript",
      auth: true,
      summary: "Get the tab transcript",
      example: `curl -s -H "Authorization: Bearer $TOKEN" ${b}/tabs/<id>/transcript`,
    },
    {
      method: "GET",
      path: "/tabs/:id/wait",
      auth: true,
      summary: "Block until tab status is ready or error",
      query: { timeout: "milliseconds (default 600000)" },
      example: `curl -s -H "Authorization: Bearer $TOKEN" "${b}/tabs/<id>/wait?timeout=60000"`,
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
