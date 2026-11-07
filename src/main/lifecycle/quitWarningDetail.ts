/** Why quitting would interrupt work, or null when nothing is running. */
export function quitWarningDetail(runningChats: number): string | null {
  if (runningChats === 0) return null;
  return runningChats === 1
    ? "1 chat is still running. Quitting will stop it."
    : `${runningChats} chats are still running. Quitting will stop them.`;
}
