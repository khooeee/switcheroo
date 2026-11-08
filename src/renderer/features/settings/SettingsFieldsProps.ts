import type { SettingsDraft } from "./SettingsDraft";

/** What each Settings modal section reads and edits. */
export type SettingsFieldsProps = {
  draft: SettingsDraft;
  busy: boolean;
  onChange: (patch: Partial<SettingsDraft>) => void;
};
