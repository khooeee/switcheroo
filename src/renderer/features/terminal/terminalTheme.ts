import type { ITheme } from "@xterm/xterm";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** xterm theme derived from the app light/dark CSS variables. */
export function terminalXtermTheme(): ITheme {
  const light = document.documentElement.dataset.theme === "light";
  const background = cssVar("--bg-1");
  const foreground = cssVar("--text");
  const dim = cssVar("--text-dim");
  const selection = cssVar("--bg-3");
  const danger = cssVar("--danger");
  const accent = cssVar("--accent");
  const warm = cssVar("--accent-2");
  const blue = cssVar("--codex");

  if (light) {
    return {
      background,
      foreground,
      cursor: foreground,
      cursorAccent: background,
      selectionBackground: selection,
      selectionInactiveBackground: selection,
      black: "#1a2026",
      red: danger,
      green: "#2d8a5e",
      yellow: warm,
      blue,
      magenta: "#7a4e8c",
      cyan: "#2a8f8f",
      white: dim,
      brightBlack: dim,
      brightRed: "#d96060",
      brightGreen: "#3aa06c",
      brightYellow: "#c87a2e",
      brightBlue: "#3a82ab",
      brightMagenta: "#9160a4",
      brightCyan: "#35a3a3",
      brightWhite: foreground,
    };
  }

  return {
    background,
    foreground,
    cursor: foreground,
    cursorAccent: background,
    selectionBackground: selection,
    selectionInactiveBackground: selection,
    black: "#0b0d0f",
    red: danger,
    green: "#3dd6a0",
    yellow: warm,
    blue,
    magenta: "#c792ea",
    cyan: accent,
    white: dim,
    brightBlack: dim,
    brightRed: "#ffb4b4",
    brightGreen: "#6aebb8",
    brightYellow: "#f5b87a",
    brightBlue: "#a8d4ef",
    brightMagenta: "#e0b0ff",
    brightCyan: "#7aeee3",
    brightWhite: foreground,
  };
}
