import type { Terminal } from "@xterm/xterm";
import { WebLinksAddon } from "@xterm/addon-web-links";

/** Main process (`installExternalLinks`) routes window.open to the system browser. */
function openExternal(_event: MouseEvent, uri: string): void {
  window.open(uri);
}

/** Makes URLs in terminal output clickable: plain-text URLs and OSC 8 hyperlinks. */
export function installTerminalLinks(term: Terminal): void {
  term.options.linkHandler = { activate: openExternal, allowNonHttpProtocols: false };
  term.loadAddon(new WebLinksAddon(openExternal));
}
