import { useMemo, type RefObject } from "react";
import { useShowRightRail } from "../chat/useShowRightRail";
import { startRightRailResize } from "../chat/startRightRailResize";
import { onEditContextMenu } from "../copy/onEditContextMenu";
import { groupVoiceTurns } from "./groupVoiceTurns";
import { useVoiceLog } from "./useVoiceLog";
import { VoiceLogRow } from "./VoiceLogRow";
import { voiceTurnDetails } from "./voiceTurnDetails";
import "../chat/rightRail.css";
import "../chat/transcript.css";
import "./voiceLog.css";

/** Keeps the Voice Log rail's width apart from the session tabs' rails. */
const RAIL_ID = "voice-log";

/** Right rail for the Voice Log: one voice turn in full, with its tool calls, searches, notices and token usage. */
export function VoiceTurnRail({ turnId, scrollRef }: { turnId: string; scrollRef: RefObject<HTMLDivElement | null> }) {
  const entries = useVoiceLog();
  const turn = useMemo(() => (entries ? groupVoiceTurns(entries).turns.get(turnId) : undefined), [entries, turnId]);
  useShowRightRail(RAIL_ID);

  return (
    <aside className="right-rail" aria-label="Turn Details">
      <div
        className="right-rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize right rail"
        onPointerDown={startRightRailResize}
      />
      <div className="right-rail-header">
        <h2>Turn Details</h2>
        <div className="right-rail-header-actions">
          <button type="button" className="btn" aria-label="Close right rail" data-tooltip="Close" onClick={voiceTurnDetails.close}>
            ✕
          </button>
        </div>
      </div>
      <div className="right-rail-scroll" ref={scrollRef} onContextMenu={onEditContextMenu}>
        <div className="transcript">
          {!entries && <div className="empty">Loading…</div>}
          {entries && !turn && <div className="empty">This turn is no longer in the log.</div>}
          {turn?.map((entry, index) => (
            // A turn only grows at the end, so the index is a stable key.
            <VoiceLogRow key={index} entry={entry} newDay={false} />
          ))}
        </div>
      </div>
    </aside>
  );
}
