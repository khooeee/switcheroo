import { memo, useCallback } from "react";
import type { VoiceLogEntry } from "../../../shared/voiceLogEntry";
import { TurnDetailsButton } from "../copy/TurnDetailsButton";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { voiceLogRowContent } from "./voiceLogRowContent";

function time(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function day(at: number): string {
  return new Date(at).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

/** One voice log entry as a transcript message or a state divider, after a date divider when a new day starts. */
export const VoiceLogRow = memo(function VoiceLogRow({
  entry,
  newDay,
  turnId,
  onToggleDetails,
}: {
  entry: VoiceLogEntry;
  newDay: boolean;
  /** Set on messages whose turn has more in Turn Details. */
  turnId?: string;
  onToggleDetails?: (turnId: string) => void;
}) {
  const toggleDetails = useCallback(() => {
    if (turnId) onToggleDetails?.(turnId);
  }, [turnId, onToggleDetails]);
  const content = voiceLogRowContent(entry);
  if (!content && !newDay) return null;

  return (
    <>
      {newDay && <div className="voice-log-divider voice-log-day">{day(entry.at)}</div>}
      {content?.type === "divider" && (
        <div className="voice-log-divider">
          {content.text} · {time(entry.at)}
        </div>
      )}
      {content?.type === "message" && (
        <div className={`message ${content.role}`}>
          <div className="row">
            <span className={`kind-pill ${"pill" in content ? content.pill : ""}`}>{content.label}</span>
            {"status" in content && content.status ? <span className="tool-status">{content.status}</span> : null}
            <span className="event-timestamp">{time(entry.at)}</span>
          </div>
          {content.markdown ? <MarkdownBody text={content.text} /> : <div className="body">{content.text}</div>}
          {"detail" in content && content.detail ? (
            <details className="voice-log-detail">
              <summary>Details</summary>
              <div className="body">{content.detail}</div>
            </details>
          ) : null}
          {turnId && onToggleDetails ? (
            <div className="event-actions">
              <TurnDetailsButton onToggle={toggleDetails} />
            </div>
          ) : null}
        </div>
      )}
    </>
  );
});
