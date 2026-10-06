/** Why quitting would interrupt work, or null when nothing is running. */
export function quitWarningDetail({
  runningChats,
  openTerminals,
}: {
  runningChats: number;
  openTerminals: number;
}): string | null {
  const parts: string[] = [];
  if (runningChats > 0) {
    parts.push(`${runningChats} chat${runningChats === 1 ? " is" : "s are"} still running`);
  }
  if (openTerminals > 0) {
    parts.push(`${openTerminals} terminal${openTerminals === 1 ? " is" : "s are"} open`);
  }
  if (!parts.length) return null;
  const sentence = parts.join(" and ");
  const it = runningChats + openTerminals === 1 ? "it" : "them";
  return `${sentence[0].toUpperCase()}${sentence.slice(1)}. Quitting will stop ${it}.`;
}
