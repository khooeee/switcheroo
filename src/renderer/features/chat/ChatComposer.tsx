import { useEffect, useMemo, useRef, useState } from "react";
import type { Session, TranscriptItem } from "../../../shared/types";
import { formatAgentError } from "../../../shared/formatAgentError";
import { ComposerResize } from "./ComposerResize";
import { ComposerPrompt } from "./ComposerPrompt";
import { applyPromptImagePaste } from "./applyPromptImagePaste";
import {
  applyComposerHistoryEdit,
  applyComposerHistoryKey,
  emptyComposerHistory,
  type ComposerHistoryState,
} from "./composerHistory";
import { formatSessionUsage } from "./formatSessionUsage";
import { useComposerDraft } from "./useComposerDraft";
import { userPromptHistory } from "./userPromptHistory";

export function ChatComposer({
  session,
  items,
  promptFocus,
  onSend,
  onInterrupt,
  onClose,
}: {
  session: Session;
  items: TranscriptItem[];
  promptFocus: number;
  onSend: (text: string) => Promise<void>;
  onInterrupt: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useComposerDraft(session.id);
  const [historyState, setHistoryState] = useState<ComposerHistoryState>(emptyComposerHistory);
  const [sendError, setSendError] = useState<{ sessionId: string; message: string } | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const previousSession = useRef({ id: session.id, status: session.status });
  const history = useMemo(() => userPromptHistory(items), [items]);
  const showStop = session.status === "running" && !draft.trim();
  const sendLabel = showStop ? "Stop agent (Escape / Ctrl+C)" : session.status === "running"
    ? (session.supportsSteering ? "Steer agent" : "Queue message")
    : "Send message";
  const usageLabel = session.usage ? formatSessionUsage(session.usage) : null;

  const setDraftFromUser = (text: string) => {
    setHistoryState((state) => applyComposerHistoryEdit(state, text));
    setDraft(text);
  };

  const send = () => {
    if (!draft.trim() || session.status === "connecting") return;
    const text = draft;
    setDraft("");
    setHistoryState(emptyComposerHistory);
    setSendError(null);
    void onSend(text).catch((error: unknown) => {
      setSendError({ sessionId: session.id, message: `Could not send “${text}”: ${formatAgentError(error)}` });
    });
  };

  const promptFocusSeen = useRef(promptFocus);
  useEffect(() => {
    if (promptFocusSeen.current === promptFocus) return;
    promptFocusSeen.current = promptFocus;
    promptRef.current?.focus();
  }, [promptFocus]);

  useEffect(() => {
    setHistoryState(emptyComposerHistory);
  }, [session.id]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => promptRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [session.id]);

  useEffect(() => {
    const previous = previousSession.current;
    if (previous.id === session.id && previous.status === "connecting" && session.status === "ready") {
      promptRef.current?.focus();
    }
    previousSession.current = { id: session.id, status: session.status };
  }, [session.id, session.status]);

  return (
    <div className="composer">
      <ComposerResize />
      <ComposerPrompt
        draft={draft}
        promptRef={promptRef}
        commands={session.slashCommands ?? []}
        onDraftChange={setDraftFromUser}
        placeholder={
          session.status === "connecting"
            ? "Draft your message while the session is being created…"
            : session.status === "running"
              ? `${session.supportsSteering ? "Steer the agent" : "Queue a follow-up"}… (Enter to send, Shift+Enter for newline)`
              : "Message the agent… (Enter to send, Shift+Enter for newline)"
        }
        onPaste={(e) => {
          void applyPromptImagePaste({
            event: e.nativeEvent,
            sessionId: session.id,
            draft,
            textarea: e.currentTarget,
            onDraftChange: setDraftFromUser,
            onError: (message) => setSendError({ sessionId: session.id, message }),
          });
        }}
        onKeyDown={(e) => {
          if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !e.metaKey && !e.altKey && !e.ctrlKey && !e.shiftKey) {
            const next = applyComposerHistoryKey(historyState, e.key, draft, history);
            if (!next) return false;
            setHistoryState(next.state);
            setDraft(next.draft);
            requestAnimationFrame(() => {
              const el = promptRef.current;
              if (!el) return;
              const end = next.draft.length;
              el.setSelectionRange(end, end);
            });
            return true;
          }
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            send();
            return true;
          }
          if (
            e.key.toLowerCase() === "c"
            && e.ctrlKey
            && !e.metaKey
            && !e.altKey
            && !e.shiftKey
            && session.status === "running"
          ) {
            onInterrupt();
            return true;
          }
          if (
            e.key.toLowerCase() === "d"
            && e.ctrlKey
            && !e.metaKey
            && !e.altKey
            && !e.shiftKey
            && draft === ""
          ) {
            onClose();
            return true;
          }
          return false;
        }}
      />
      {sendError?.sessionId === session.id && (
        <div className="composer-error" role="alert">{sendError.message}</div>
      )}
      <div className="composer-actions">
        {usageLabel ? (
          <div className="composer-usage" data-tooltip={usageLabel.detail}>
            {usageLabel.percent}
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )}
        <button
          type="button"
          className="btn primary composer-send"
          aria-label={sendLabel}
          data-tooltip={sendLabel}
          data-tooltip-align="center"
          disabled={(!showStop && !draft.trim()) || session.status === "connecting"}
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
  );
}
