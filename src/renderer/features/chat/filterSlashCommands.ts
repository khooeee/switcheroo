import type { SlashCommand } from "../../../shared/types";

export function filterSlashCommands(
  commands: SlashCommand[],
  query: string,
): SlashCommand[] {
  const needle = query.toLowerCase();
  return commands.filter((command) => {
    const name = command.name.replace(/^\//, "").toLowerCase();
    return name.startsWith(needle);
  });
}
