/** Keep Electron alive when console writes hit a closed stdout/stderr pipe. */
export function installStdioGuards(
  onFatal?: (error: Error) => void,
): void {
  const ignore = (): void => undefined;
  process.stdout?.on("error", ignore);
  process.stderr?.on("error", ignore);

  // console.* can surface EPIPE as uncaughtException after the write returns;
  // stream 'error' listeners alone do not always prevent Electron's dialog.
  process.on("uncaughtException", (error: NodeJS.ErrnoException) => {
    if (error.code === "EPIPE" || error.code === "EIO") return;
    onFatal?.(error);
  });
}
