import type { SessionTab } from "../../shared/session";

/** Next default title: Terminal, Terminal 2, Terminal 3, … */
export function nextTerminalTitle(existing: SessionTab[]): string {
  const used = new Set(
    existing.filter((t) => t.kind === "terminal").map((t) => t.title.toLowerCase()),
  );
  if (!used.has("terminal")) return "Terminal";
  for (let n = 2; ; n++) {
    const title = `Terminal ${n}`;
    if (!used.has(title.toLowerCase())) return title;
  }
}
