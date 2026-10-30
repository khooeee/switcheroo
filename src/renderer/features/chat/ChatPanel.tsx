import type { RefObject } from "react";
import type { CursorAskQuestionRequest } from "../../../shared/agentRequests";
import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import { SaveViewMarkdownButton } from "../copy/SaveViewMarkdownButton";
import { AskQuestionBar, type AskQuestionOutcome } from "../permissions/AskQuestionBar";
import { firstLine } from "../sessions/firstLine";
import { sessionMarkdown } from "../sessions/sessionMarkdown";
import { OpenSubagentIdContext } from "../subagents/OpenSubagentIdContext";
import { SessionTranscript } from "./SessionTranscript";
import { ChatComposer } from "./ChatComposer";
import "./transcript.css";

interface Props {
  session: Session;
  turns: TranscriptTurn[];
  focusEventId: string | null;
  focusTurnId: string | null;
  focusEventKey: number;
  promptFocus: number;
  chatRef: RefObject<HTMLDivElement | null>;
  onOpenRightRail: (turnId: string, focusEventId?: string) => void;
  onForceOpenRightRail: (turnId: string, focusEventId?: string) => void;
  /** Subagent shown in the right rail; its chip in the transcript looks pressed. */
  openSubagentId: string | null;
  onSend: (text: string) => Promise<void>;
  onInterrupt: () => void;
  askQuestion: CursorAskQuestionRequest | null;
  onAsk: (outcome: AskQuestionOutcome) => void;
}

export function ChatPanel({
  session,
  turns,
  focusEventId,
  focusTurnId,
  focusEventKey,
  promptFocus,
  chatRef,
  onOpenRightRail,
  onForceOpenRightRail,
  openSubagentId,
  onSend,
  onInterrupt,
  askQuestion,
  onAsk,
}: Props) {
  const title = firstLine(session.title);

  return (
    <section className="panel relative" data-save-view={turns.length ? "session" : undefined}>
      <div className="panel-header">
        <div>
          <h2 title={session.title}>{title}</h2>
          <div className="meta">{session.cwd}</div>
        </div>
        {turns.length ? (
          <SaveViewMarkdownButton
            view="session"
            getMarkdown={() => sessionMarkdown(session, turns)}
            nameHint={title}
          />
        ) : null}
      </div>

      <OpenSubagentIdContext.Provider value={openSubagentId}>
        <SessionTranscript
          session={session}
          turns={turns}
          focusEventId={focusEventId}
          focusTurnId={focusTurnId}
          focusEventKey={focusEventKey}
          chatRef={chatRef}
          onOpenRightRail={onOpenRightRail}
          onForceOpenRightRail={onForceOpenRightRail}
        />
      </OpenSubagentIdContext.Provider>

      {askQuestion && <AskQuestionBar request={askQuestion} onAnswer={onAsk} />}

      <ChatComposer
        session={session}
        turns={turns}
        promptFocus={promptFocus}
        onSend={onSend}
        onInterrupt={onInterrupt}
      />
    </section>
  );
}
