import type * as acp from "@agentclientprotocol/sdk";
import type { SessionModelConfig } from "../../shared/session";

/** Name of a select option's current value. Claude's "default" model names the resolved model in its description. */
function currentName(option: acp.SessionConfigOption): string | undefined {
  if (option.type !== "select") return undefined;
  const values = option.options.flatMap((entry) => ("group" in entry ? entry.options : [entry]));
  const current = values.find((value) => value.value === option.currentValue);
  if (!current) return option.currentValue;
  return current.value === "default" && current.description ? current.description : current.name;
}

/** Model and effort from ACP session config options (categories `model` / `thought_level`). */
export function modelConfigFromOptions(
  options: acp.SessionConfigOption[] | null | undefined,
): SessionModelConfig | null {
  const model = options?.find((option) => option.category === "model");
  const effort = options?.find((option) => option.category === "thought_level");
  if (!model && !effort) return null;
  return {
    model: model && currentName(model),
    effort: effort && currentName(effort),
  };
}
