import { controlRoutesCatalog } from "./controlRoutesCatalog";

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
