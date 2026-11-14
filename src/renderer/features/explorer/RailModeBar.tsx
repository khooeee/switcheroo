import type { ComponentType } from "react";
import type { RailMode } from "../../../shared/railMode";
import { isMac } from "../shortcuts/isMac";
import { FilesIcon } from "./FilesIcon";
import { railModeStore } from "./railModeStore";
import { SessionsIcon } from "./SessionsIcon";
import { useRailMode } from "./useRailMode";
import "./railModes.css";

const MODES: Array<{ mode: RailMode; label: string; Icon: ComponentType }> = [
  { mode: "sessions", label: "Sessions", Icon: SessionsIcon },
  { mode: "files", label: "Files", Icon: FilesIcon },
];

const TOGGLE_HINT = isMac ? "⇧⌘E" : "Ctrl+Shift+E";

/** Icons at the top of the rail that switch between the session list and the file explorer. */
export function RailModeBar({ hasSessions }: { hasSessions: boolean }) {
  const current = useRailMode();
  return (
    <div className="rail-modes" role="tablist" aria-label="Rail view">
      {MODES.map(({ mode, label, Icon }) => (
        <button
          key={mode}
          type="button"
          role="tab"
          className={`rail-session rail-mode${current === mode ? " active" : ""}`}
          aria-selected={current === mode}
          aria-label={label}
          disabled={mode === "files" && !hasSessions}
          data-tooltip={`${label} (${TOGGLE_HINT})`}
          data-tooltip-align="center"
          onClick={() => railModeStore.set(mode)}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
