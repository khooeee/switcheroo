import { isMac } from "../shortcuts/isMac";
import { findOptions, type FindOptions } from "./findOptions";

const TOGGLES = [
  { key: "matchCase", label: "Match Case", letter: "C", glyph: "Aa" },
  { key: "wholeWord", label: "Match Whole Word", letter: "W", glyph: <span className="find-whole-word-glyph">ab</span> },
] as const;

/** Match Case / Match Whole Word buttons in the find bar. */
export function FindOptionToggles({ options }: { options: FindOptions }) {
  return TOGGLES.map(({ key, label, letter, glyph }) => (
    <button
      key={key}
      type="button"
      className="btn find-toggle"
      aria-label={label}
      aria-pressed={options[key]}
      data-tooltip={`${label} (${isMac ? `⌥⌘${letter}` : `Alt+${letter}`})`}
      // Keep focus in the input so Enter still steps through matches.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => findOptions.toggle(key)}
    >
      {glyph}
    </button>
  ));
}
