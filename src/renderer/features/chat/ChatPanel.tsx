import { useEffect, useRef, useState, type RefObject } from "react";
import type {
  CursorAskQuestionRequest,
  PermissionRequest,
  SessionTab,
  TranscriptItem,
} from "../../../shared/types";
import { PermissionBar } from "../permissions/PermissionBar";
import { stripCursorStreamNoise } from "../../../shared/cursorStreamNoise";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { ComposerResize } from "./ComposerResize";
import { FileChanges } from "../files/FileChanges";

interface Props {
  tab: SessionTab;
  draft: string;
  onDraftChange: (text: string) => void;
  items: TranscriptItem[];
  focusEventId: string | null;
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
  tab,
  draft,
  onDraftChange,
  items,
  focusEventId,
  promptFocus,
  chatRef,
  onSend,
  onInterrupt,
  permission,
  askQuestion,
  onPermission,
  onAsk,
}: Props) {
  const [sendError, setSendError] = useState<{ tabId: string; message: string } | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const previousSession = useRef({ id: tab.id, status: tab.status });
  const showStop = tab.status === "running" && !draft.trim();
  const sendLabel = showStop ? "Stop agent (Escape)" : tab.status === "running"
    ? (tab.supportsSteering ? "Steer agent" : "Queue message")
    : "Send message";

  const send = () => {
    if (!draft.trim() || tab.status === "connecting") return;
    const text = draft;
    onDraftChange("");
    setSendError(null);
    void onSend(text).catch((error: unknown) => {
      setSendError({ tabId: tab.id, message: `Could not send “${text}”: ${String(error)}` });
    });
  };

  useEffect(() => {
    promptRef.current?.focus();
  }, [promptFocus]);

  useEffect(() => {
    const previous = previousSession.current;
    if (previous.id === tab.id && previous.status === "connecting" && tab.status === "ready") {
      promptRef.current?.focus();
    }
    previousSession.current = { id: tab.id, status: tab.status };
  }, [tab.id, tab.status]);

  useEffect(() => {
    if (!focusEventId) return;
    const el = document.querySelector(`[data-event-id="${focusEventId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight");
      const t = setTimeout(() => el.classList.remove("highlight"), 1200);
      return () => clearTimeout(t);
    }
  }, [focusEventId, tab.id]);

  return (
    <section className="panel relative">
      <div className="panel-header">
        <div>
          <h2>{tab.title}</h2>
          <div className="meta">{tab.cwd}</div>
          <div className="meta">
            {tab.agentKind} · {tab.status === "connecting" ? "Creating" : tab.status}
            {tab.error ? ` · ${tab.error}` : ""}
          </div>
        </div>
      </div>

      <div className="scroll" ref={chatRef}>
        <div className="transcript">
          {items.length === 0 && tab.status !== "running" && tab.status !== "connecting" && (
            <div className="empty">
              Send a prompt to start this session.
            </div>
          )}
          {items.map((item) => {
            const text =
              tab.agentKind === "cursor" ? stripCursorStreamNoise(item.text) : item.text;
            return (
              <div
                key={item.id}
                className={`message ${item.role}${item.fileChanges?.length ? " has-file-changes" : ""}`}
                data-event-id={item.id}
                data-find-text={text}
              >
                {item.role !== "stopped" && <div className="row">
                  <span className="kind-pill">{item.role}</span>
                  {item.toolStatus && <span className="tool-status">{item.toolStatus}</span>}
                  <span className="event-timestamp" style={{ marginLeft: "auto" }}>
                    {new Date(item.at).toLocaleTimeString()}
                  </span>
                </div>}
                {item.fileChanges?.length ? (
                  <FileChanges changes={item.fileChanges} status={item.toolStatus} cwd={tab.cwd} tabId={tab.id} />
                ) : <div className="body">{text}</div>}
              </div>
            );
          })}
          {tab.status === "running" && <ThinkingIndicator />}
          {tab.status === "connecting" && <ThinkingIndicator label="Creating session" />}
        </div>
      </div>

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

      <div className="composer">
        <ComposerResize />
        <textarea
          ref={promptRef}
          value={draft}
          placeholder={
            tab.status === "connecting"
              ? "Draft your message while the session is being created…"
              : tab.status === "running"
                ? `${tab.supportsSteering ? "Steer the agent" : "Queue a follow-up"}… (Enter to send, Shift+Enter for newline)`
              : "Message the agent… (Enter to send, Shift+Enter for newline)"
          }
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        {sendError?.tabId === tab.id && <div role="alert">{sendError.message}</div>}
        <div className="composer-actions">
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="btn primary composer-send"
            aria-label={sendLabel}
            title={sendLabel}
            disabled={(!showStop && !draft.trim()) || tab.status === "connecting"}
            onClick={showStop ? onInterrupt : send}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {showStop ? (
                <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
              ) : (
                <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
