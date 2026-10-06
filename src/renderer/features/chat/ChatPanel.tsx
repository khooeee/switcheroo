import type { RefObject } from "react";
import type { CursorAskQuestionRequest, PermissionRequest } from "../../../shared/agentRequests";
import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import { AskQuestionBar, type AskQuestionOutcome } from "../permissions/AskQuestionBar";
import { PermissionBar } from "../permissions/PermissionBar";
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
  rightRailOpen: boolean;
  /** Subagent shown in the right rail; its chip in the transcript looks pressed. */
  openSubagentId: string | null;
  onSend: (text: string) => Promise<void>;
  onInterrupt: () => void;
  permission: PermissionRequest | null;
  askQuestion: CursorAskQuestionRequest | null;
  onPermission: (optionId: string | "cancelled") => void;
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
  rightRailOpen,
  openSubagentId,
  onSend,
  onInterrupt,
  permission,
  askQuestion,
  onPermission,
  onAsk,
}: Props) {
  return (
    <section className="panel relative">
      <div className="panel-header">
        <div>
          <h2>{session.title}</h2>
          <div className="meta">{session.cwd}</div>
        </div>
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
          rightRailOpen={rightRailOpen}
        />
      </OpenSubagentIdContext.Provider>

      {permission && (
        <PermissionBar request={permission} onRespond={onPermission} />
      )}

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
