import { BrowserWindow, Menu, type MenuItemConstructorOptions } from "electron";
import type * as acp from "@agentclientprotocol/sdk";
import type { ConfigMenuCategory } from "../../shared/configMenuCategory";

type SelectOption = Extract<acp.SessionConfigOption, { type: "select" }>;
type OnSelect = (configId: string, value: string) => void;

function choiceItem(
  option: SelectOption,
  choice: acp.SessionConfigSelectOption,
  onSelect: OnSelect,
): MenuItemConstructorOptions {
  return {
    label: choice.name,
    type: "radio",
    checked: choice.value === option.currentValue,
    toolTip: choice.description ?? undefined,
    click: () => {
      if (choice.value !== option.currentValue) onSelect(option.id, choice.value);
    },
  };
}

/** Radio items for an option's values; grouped values get a disabled header per group. */
function choiceItems(option: SelectOption, onSelect: OnSelect): MenuItemConstructorOptions[] {
  return option.options.flatMap((entry, index): MenuItemConstructorOptions[] => {
    if (!("group" in entry)) return [choiceItem(option, entry, onSelect)];
    return [
      ...(index > 0 ? [{ type: "separator" as const }] : []),
      { label: entry.name, enabled: false },
      ...entry.options.map((choice) => choiceItem(option, choice, onSelect)),
    ];
  });
}

/** Model or effort picker. The model menu also lists per-model settings (`model_config`) as submenus. */
export function showConfigOptionMenu(
  win: BrowserWindow | null,
  options: acp.SessionConfigOption[],
  category: ConfigMenuCategory,
  onSelect: OnSelect,
): void {
  if (!win || win.isDestroyed()) return;
  const selects = options.filter((option): option is SelectOption => option.type === "select");
  const items = selects
    .filter((option) => option.category === category)
    .flatMap((option) => choiceItems(option, onSelect));
  if (category === "model") {
    const settings = selects.filter((option) => option.category === "model_config");
    if (settings.length && items.length) items.push({ type: "separator" });
    for (const option of settings) items.push({ label: option.name, submenu: choiceItems(option, onSelect) });
  }
  if (!items.length) return;
  Menu.buildFromTemplate(items).popup({ window: win });
}
