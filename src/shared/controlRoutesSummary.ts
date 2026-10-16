import { controlRoutesCatalog } from "./controlRoutesCatalog";

type Route = ReturnType<typeof controlRoutesCatalog>[number];

/** `key: desc` pairs; an "optional …" description becomes `key?: …`. */
function fields(map: Record<string, string>): string {
  const pairs = Object.entries(map).map(([key, desc]) => {
    const rest = desc.replace(/^optional\b\s*(—\s*)?/, "");
    const name = rest === desc ? key : `${key}?`;
    return rest ? `${name}: ${rest}` : name;
  });
  return `{ ${pairs.join(", ")} }`;
}

function routeLine(route: Route): string {
  const parts = [`${route.method} ${route.path}`];
  if (route.query) parts.push(`query ${fields(route.query)}`);
  if (route.body) parts.push(`body ${fields(route.body)}`);
  const response = typeof route.response === "string" ? route.response : `{ ${Object.keys(route.response).join(", ")} }`;
  return `- ${parts.join(" ")} → ${response} — ${route.summary}`;
}

/** One line per authed route, so the bootstrap prompt carries the API without a GET / round trip. */
export function controlRoutesSummary(): string {
  return controlRoutesCatalog("")
    .filter((route) => route.auth)
    .map(routeLine)
    .join("\n");
}
