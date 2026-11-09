import type { WebContents } from "electron";

function withoutHash(url: string): string {
  return url.split("#")[0]!;
}

/**
 * Keep the window on the app page. A dropped link or file would otherwise load in its place
 * and inherit the preload API; only reloading the app itself (Vite full reloads) is allowed.
 */
export function installNavigationGuard(contents: WebContents): void {
  contents.on("will-navigate", (event, url) => {
    if (withoutHash(url) !== withoutHash(contents.getURL())) event.preventDefault();
  });
}
