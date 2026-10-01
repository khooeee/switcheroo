import type { RefObject } from "react";
import type {
  CursorAskQuestionRequest,
  PermissionRequest,
  Session,
  TranscriptItem,
} from "../../../shared/types";
import { PermissionBar } from "../permissions/PermissionBar";
import { SessionTranscript } from "./SessionTranscript";
import { ChatComposer } from "./ChatComposer";

interface Props {
  session: Session;
  items: TranscriptItem[];
  focusEventId: string | null;
  focusEventKey: number;
  promptFocus: number;
  chatRef: RefObject<HTMLDivElement | null>;
  onSend: (text: string) => Promise<void>;
  onInterrupt: () => void;
  permission: PermissionRequest | null;
  askQuestion: CursorAskQuestionRequest | null;
  onPermission: (optionId: string | "cancelled") => void;
  onAsk: (
    outcome:
      | {
          outcome: "answered";
          answers: Array<{ questionId: string; selectedOptionIds: string[] }>;
        }
      | { outcome: "skipped" }
      | { outcome: "cancelled" },
  ) => void;
}

export function ChatPanel({
  session,
  items,
  focusEventId,
  focusEventKey,
  promptFocus,
  chatRef,
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
          <div className="meta">
            {session.agent} · {session.status === "connecting" ? "Creating" : session.status}
            {session.error ? <span className="session-error"> · {session.error}</span> : ""}
          </div>
        </div>
      </div>

      <SessionTranscript
        session={session}
        items={items}
        focusEventId={focusEventId}
        focusEventKey={focusEventKey}
        chatRef={chatRef}
      />

      {permission && (
        <PermissionBar request={permission} onRespond={onPermission} />
      )}

      {askQuestion && (
        <div className="permission-bar">
          <strong>{askQuestion.title ?? "Agent question"}</strong>
          {askQuestion.questions.map((q) => (
            <div key={q.id} style={{ width: "100%" }}>
              <div>{q.prompt}</div>
              <div className="composer-actions">
                {q.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="btn"
                    onClick={() =>
                      onAsk({
                        outcome: "answered",
                        answers: [
                          { questionId: q.id, selectedOptionIds: [opt.id] },
                        ],
                      })
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button type="button" className="btn" onClick={() => onAsk({ outcome: "skipped" })}>
            Skip
          </button>
        </div>
      )}

      <ChatComposer
        session={session}
        items={items}
        promptFocus={promptFocus}
        onSend={onSend}
        onInterrupt={onInterrupt}
      />
    </section>
  );
}
