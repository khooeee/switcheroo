import { useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { onEditContextMenu } from "../copy/onEditContextMenu";
import { groupVoiceTurns } from "./groupVoiceTurns";
import { isVoiceLogMainEntry } from "./isVoiceLogMainEntry";
import { useVoiceLog } from "./useVoiceLog";
import { VoiceLogRow } from "./VoiceLogRow";
import { voiceTurnDetails } from "./voiceTurnDetails";
import "../chat/transcript.css";
import "./voiceLog.css";

/** Within this many px of the bottom, new entries keep the view pinned there. */
const STICK_PX = 40;

function sameDay(a: number, b: number): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/** Main-pane view of recent voice activity, styled like a session transcript; follows new entries. */
export function VoiceLogPanel({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const entries = useVoiceLog();
  const stuck = useRef(true);
  const { turnOf, turns } = useMemo(() => groupVoiceTurns(entries ?? []), [entries]);
  /** Turns with something beyond what the main view shows. */
  const detailed = useMemo(
    () => new Set([...turns].filter(([, list]) => list.some((entry) => !isVoiceLogMainEntry(entry))).map(([id]) => id)),
    [turns],
  );

  // Tool calls, searches, notices and token usage live in Turn Details; day dividers follow the shown entries.
  const rows: ReactNode[] = [];
  let lastAt: number | null = null;
  entries?.forEach((entry, index) => {
    if (!isVoiceLogMainEntry(entry)) return;
    const turnId = turnOf[index];
    const message = entry.kind === "heard" || entry.kind === "said";
    rows.push(
      // Append-only list, so the index is a stable key.
      <VoiceLogRow
        key={index}
        entry={entry}
        newDay={lastAt === null || !sameDay(lastAt, entry.at)}
        turnId={message && turnId && detailed.has(turnId) ? turnId : undefined}
        onToggleDetails={voiceTurnDetails.toggle}
      />,
    );
    lastAt = entry.at;
  });

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
          {rows}
        </div>
      </div>
      <div className="scroll-fade" aria-hidden="true" />
    </section>
  );
}
