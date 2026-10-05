import { controlRoutesCatalog } from "./controlRoutesCatalog";

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
