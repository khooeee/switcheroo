import type * as acp from "@agentclientprotocol/sdk";
import type { SessionUsage, SlashCommand } from "../../shared/session";

type ThreadStatus = "active" | "idle" | "systemError";

type UpdateHandlers = {
  onAvailableCommands: (commands: SlashCommand[]) => void;
  onUsage: (usage: SessionUsage) => void;
  /** Transcript output (messages, thoughts, tool calls, ...). */
  onOutput: (update: acp.SessionUpdate) => void;
  onThreadStatus: (status: ThreadStatus) => void;
};

/** Codex reports live turn state in `_meta.codex.threadStatus`. */
function codexThreadStatus(update: acp.SessionUpdate): ThreadStatus | null {
  const codex = update._meta?.codex;
  const status = codex && typeof codex === "object" && "threadStatus" in codex
    ? codex.threadStatus : null;
  if (!status || typeof status !== "object" || !("type" in status)) return null;
  if (status.type === "active" || status.type === "idle" || status.type === "systemError") {
    return status.type;
  }
  return null;
}

/** Route one ACP session/update to the matching handler. */
export function dispatchSessionUpdate(update: acp.SessionUpdate, handlers: UpdateHandlers): void {
  if (update.sessionUpdate === "available_commands_update") {
    handlers.onAvailableCommands(
      update.availableCommands.map((command) => ({
        name: command.name,
        description: command.description,
        hint: command.input && "hint" in command.input ? command.input.hint : undefined,
      })),
    );
    return;
  }
  if (update.sessionUpdate === "usage_update") {
    handlers.onUsage({
      used: update.used,
      size: update.size,
      cost: update.cost
        ? { amount: update.cost.amount, currency: update.cost.currency }
        : undefined,
    });
    return;
  }
  handlers.onOutput(update);
  const status = codexThreadStatus(update);
  if (status) handlers.onThreadStatus(status);
}
