import type { ComponentType } from "react";
import type { RailMode } from "../../../shared/railMode";
import { FilesIcon } from "./FilesIcon";
import { railModeStore } from "./railModeStore";
import { SessionsIcon } from "./SessionsIcon";
import { useRailMode } from "./useRailMode";
import "./railModes.css";

const MODES: Array<{ mode: RailMode; label: string; Icon: ComponentType }> = [
  { mode: "sessions", label: "Sessions", Icon: SessionsIcon },
  { mode: "files", label: "File Explorer", Icon: FilesIcon },
];

/** Icons at the top of the rail that switch between the session list and the file explorer. */
export function RailModeBar() {
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
          data-tooltip={label}
          data-tooltip-align="center"
          onClick={() => railModeStore.set(mode)}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
