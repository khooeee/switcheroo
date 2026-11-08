import { useLayoutEffect, useRef } from "react";
import { onEditContextMenu } from "../copy/onEditContextMenu";
import { useVoiceLog } from "./useVoiceLog";
import { VoiceLogRow } from "./VoiceLogRow";
import "../chat/transcript.css";
import "./voiceLog.css";

/** Within this many px of the bottom, new entries keep the view pinned there. */
const STICK_PX = 40;

function sameDay(a: number, b: number): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/** Main-pane view of recent voice activity, styled like a session transcript; follows new entries. */
export function VoiceLogPanel() {
  const entries = useVoiceLog();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stuck.current) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <section className="panel relative">
      <div className="panel-header">
        <div>
          <h2>Voice Log</h2>
          <div className="meta">What voice heard, said and did, newest at the bottom</div>
        </div>
      </div>
      <div
        className="scroll"
        ref={scrollRef}
        onContextMenu={onEditContextMenu}
        onScroll={(event) => {
          const el = event.currentTarget;
          stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
        }}
      >
        <div className="transcript">
          {entries?.length === 0 && <div className="empty">No voice activity yet.</div>}
          {entries?.map((entry, index) => (
            // Append-only list, so the index is a stable key.
            <VoiceLogRow key={index} entry={entry} newDay={index === 0 || !sameDay(entries[index - 1].at, entry.at)} />
          ))}
        </div>
      </div>
      <div className="scroll-fade" aria-hidden="true" />
    </section>
  );
}
