import { BrowserWindow, Menu, type MenuItemConstructorOptions } from "electron";
import type * as acp from "@agentclientprotocol/sdk";
import type { ConfigMenuCategory } from "../../shared/configMenuCategory";

type SelectOption = Extract<acp.SessionConfigOption, { type: "select" }>;
type ConfigChoice = { configId: string; value: string };
type OnSelect = (choice: ConfigChoice) => void;

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
      if (choice.value !== option.currentValue) onSelect({ configId: option.id, value: choice.value });
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

/**
 * Model or effort picker; resolves with the new value, or null when dismissed or unchanged.
 * The model menu also lists per-model settings (`model_config`) as submenus.
 */
export function showConfigOptionMenu(
  win: BrowserWindow | null,
  options: acp.SessionConfigOption[],
  category: ConfigMenuCategory,
): Promise<ConfigChoice | null> {
  if (!win || win.isDestroyed()) return Promise.resolve(null);
  let resolve: (choice: ConfigChoice | null) => void = () => undefined;
  const picked = new Promise<ConfigChoice | null>((done) => { resolve = done; });
  const selects = options.filter((option): option is SelectOption => option.type === "select");
  const items = selects
    .filter((option) => option.category === category)
    .flatMap((option) => choiceItems(option, resolve));
  if (category === "model") {
    const settings = selects.filter((option) => option.category === "model_config");
    if (settings.length && items.length) items.push({ type: "separator" });
    for (const option of settings) items.push({ label: option.name, submenu: choiceItems(option, resolve) });
  }
  if (!items.length) return Promise.resolve(null);
  // Electron runs a picked item's click before the close callback, so a pick is never resolved as null.
  Menu.buildFromTemplate(items).popup({ window: win, callback: () => resolve(null) });
  return picked;
}
