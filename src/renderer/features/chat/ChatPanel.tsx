import { useEffect, useRef, useState, type RefObject, type ReactNode } from "react";
import type {
  CursorAskQuestionRequest,
  PermissionRequest,
  SessionTab,
  TranscriptItem,
} from "../../../shared/types";
import { PermissionBar } from "../permissions/PermissionBar";
import { stripCursorStreamNoise } from "../../../shared/cursorStreamNoise";

interface Props {
  tab: SessionTab;
  items: TranscriptItem[];
  focusEventId: string | null;
  promptFocus: number;
  findQuery: string;
  chatRef: RefObject<HTMLDivElement | null>;
  onSend: (text: string) => Promise<void>;
  onCancel: () => void;
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

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: Array<string | ReactNode> = [];
  let start = 0;
  let idx = lower.indexOf(q, start);
  let key = 0;
  while (idx >= 0) {
    parts.push(text.slice(start, idx));
    parts.push(<mark key={key++}>{text.slice(idx, idx + q.length)}</mark>);
    start = idx + q.length;
    idx = lower.indexOf(q, start);
  }
  parts.push(text.slice(start));
  return parts;
}

export function ChatPanel({
  tab,
  items,
  focusEventId,
  promptFocus,
  findQuery,
  chatRef,
  onSend,
  onCancel,
  permission,
  askQuestion,
  onPermission,
  onAsk,
}: Props) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  useEffect(() => {
    promptRef.current?.focus();
  }, [promptFocus]);

  useEffect(() => {
    if (!focusEventId) return;
    const el = document.querySelector(`[data-event-id="${focusEventId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight");
      const t = setTimeout(() => el.classList.remove("highlight"), 1200);
      return () => clearTimeout(t);
    }
  }, [focusEventId, items]);

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
          {items.length === 0 && (
            <div className="empty">
              {tab.status === "connecting"
                ? "Creating session…"
                : "Send a prompt to start this session."}
            </div>
          )}
          {items.map((item) => {
            const text =
              tab.agentKind === "cursor" ? stripCursorStreamNoise(item.text) : item.text;
            return (
              <div
                key={item.id}
                className={`message ${item.role}`}
                data-event-id={item.id}
                data-find-text={text}
              >
                <div className="row">
                  <span className="kind-pill">{item.role}</span>
                  {item.toolStatus && <span className="tool-status">{item.toolStatus}</span>}
                  <span style={{ marginLeft: "auto" }}>
                    {new Date(item.at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="body">{highlight(text, findQuery)}</div>
              </div>
            );
          })}
          <div ref={endRef} />
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
        <textarea
          ref={promptRef}
          value={draft}
          disabled={tab.status === "connecting"}
          placeholder={
            tab.status === "connecting"
              ? "Creating session…"
              : "Message the agent… (Enter to send, Shift+Enter for newline)"
          }
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!draft.trim() || sending) return;
              const text = draft;
              setDraft("");
              setSending(true);
              void onSend(text).finally(() => setSending(false));
            }
          }}
        />
        <div className="composer-actions">
          {tab.status === "running" && (
            <button type="button" className="btn danger" onClick={onCancel}>
              Cancel
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="btn primary"
            disabled={!draft.trim() || sending || tab.status === "connecting"}
            onClick={() => {
              const text = draft;
              setDraft("");
              setSending(true);
              void onSend(text).finally(() => setSending(false));
            }}
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
