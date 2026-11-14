import { SettingsMenu } from "../settings/SettingsMenu";
import { VoiceButton } from "../voice/VoiceButton";
import { VoiceLogButton } from "../voiceLog/VoiceLogButton";
import { FileExplorer } from "../explorer/FileExplorer";
import { RailModeBar } from "../explorer/RailModeBar";
import { useRailMode } from "../explorer/useRailMode";
import { flatRailSessions } from "./flatRailSessions";
import { SessionList, type SessionListProps } from "./SessionList";
import { startRailResize } from "./startRailResize";
import "./sessionRail.css";
import "./sessionRailRow.css";
import "./sessionSpinner.css";
import "./sessionRailPin.css";

/** Left rail: mode icons, then the session list or the active session's files, then the footer. */
export function SessionRail(props: SessionListProps) {
  const mode = useRailMode();
  const activeSession = mode === "files"
    ? flatRailSessions(props.pinned, props.unpinned).find((s) => s.id === props.activeTabId) ?? null
    : null;

  return (
    <aside className="rail" aria-label="Tabs">
      <div
        className="rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize tabs"
        onPointerDown={startRailResize}
      />
      <RailModeBar />
      <SessionList hidden={mode !== "sessions"} {...props} />
      {mode === "files" ? <FileExplorer session={activeSession} /> : null}
      <div className="rail-footer">
        <VoiceLogButton />
        <VoiceButton />
        <SettingsMenu />
      </div>
    </aside>
  );
}
