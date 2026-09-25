import type { SlashCommand } from "../../../shared/types";

export function applySlashCommand(command: SlashCommand): string {
  const name = command.name.startsWith("/") ? command.name : `/${command.name}`;
  return `${name} `;
}
