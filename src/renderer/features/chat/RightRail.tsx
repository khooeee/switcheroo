import { memo, useEffect, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { Session, TranscriptTurn } from "../../../shared/types";
import { stripCursorStreamNoise } from "../../../shared/cursorStreamNoise";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { FileChanges } from "../files/FileChanges";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { CopyEventButton } from "../copy/CopyEventButton";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { TurnDetail } from "./TurnDetail";
import {
  applyRightRailWidth,
  hideRightRail,
  readRightRailWidth,
  showRightRail,
} from "./rightRailWidth";

/** Scrollable right rail showing one turn in full (user + events + assistant). */
export const RightRail = memo(function RightRail({
  session,
  turn,
  agent,
  cwd,
  scrollRef,
  onClose,
  onEventActivate,
}: {
  session: Session | undefined;
  turn: TranscriptTurn;
  /** When session is missing (closed Switchboard turn). */
  agent?: string;
  cwd?: string;
  scrollRef?: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onEventActivate?: (eventId: string) => void;
}) {
  useEffect(() => {
    showRightRail();
    return () => hideRightRail();
  }, []);

  const resize = (event: ReactPointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = readRightRailWidth();
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev: PointerEvent) => {
      // Dragging the left edge: move left → wider.
      applyRightRailWidth(startWidth + (startX - ev.clientX));
    };
    const stop = (ev: PointerEvent) => {
      applyRightRailWidth(startWidth + (startX - ev.clientX), true);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  return (
    <aside className="right-rail" aria-label="Turn details">
      <div
        className="right-rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize right rail"
        onPointerDown={resize}
      />
      <div className="right-rail-header">
        <h2>Turn</h2>
        <button
          type="button"
          className="btn"
          aria-label="Close right rail"
          data-tooltip="Close"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="right-rail-scroll" ref={scrollRef}>
        {session ? (
          <TurnDetail session={session} turn={turn} onEventActivate={onEventActivate} />
        ) : (
          <ClosedTurnDetail turn={turn} agent={agent} cwd={cwd} />
        )}
      </div>
    </aside>
  );
});

/** Plain turn body when the Switchboard session is no longer open. */
const ClosedTurnDetail = memo(function ClosedTurnDetail({
  turn,
  agent,
  cwd,
}: {
  turn: TranscriptTurn;
  agent?: string;
  cwd?: string;
}) {
  const running = turn.status === "running" && !turn.user.queued;
  const userText = agent === "cursor" ? stripCursorStreamNoise(turn.user.text) : turn.user.text;
  const assistantText = turn.assistant
    ? agent === "cursor"
      ? stripCursorStreamNoise(turn.assistant.text)
      : turn.assistant.text
    : "";

  return (
    <div className="session-turn" data-turn-id={turn.id}>
      <div className={`message user${turn.user.queued ? " queued" : ""}`} data-event-id={turn.user.id}>
        <div className="row">
          <span className="kind-pill">user</span>
          <span className="event-timestamp" style={{ marginLeft: "auto" }}>
            {formatDetailTimestamp(turn.user.at)}
          </span>
        </div>
        {turn.user.queued ? <div className="message-queued" role="status">Queued</div> : null}
        <MarkdownBody text={userText} />
        <div className="event-actions">
          <CopyEventButton text={userText} />
        </div>
      </div>

      {turn.events.length > 0 ? (
        <div className="turn-events">
          {turn.events.map((item) => (
            <div key={item.id} className={`message ${item.role}`} data-event-id={item.id}>
              <div className="row">
                <span className="kind-pill">{item.role}</span>
                <span className="event-timestamp" style={{ marginLeft: "auto" }}>
                  {formatDetailTimestamp(item.at)}
                </span>
              </div>
              <div className="body">{item.text}</div>
            </div>
          ))}
        </div>
      ) : null}

      {running ? <ThinkingIndicator /> : null}

      {!running && turn.assistant ? (
        <div
          className={`message assistant${turn.fileChanges.length ? " has-file-changes" : ""}`}
          data-event-id={turn.assistant.id}
        >
          <div className="row">
            <span className="kind-pill">assistant</span>
            <span className="event-timestamp" style={{ marginLeft: "auto" }}>
              {formatDetailTimestamp(turn.assistant.at)}
            </span>
          </div>
          <MarkdownBody text={assistantText} />
          {turn.fileChanges.length ? (
            <FileChanges changes={turn.fileChanges} cwd={cwd} />
          ) : null}
          <div className="event-actions">
            <CopyEventButton text={assistantText} />
          </div>
        </div>
      ) : null}
    </div>
  );
});
