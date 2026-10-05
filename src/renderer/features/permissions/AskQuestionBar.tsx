import type { CursorAskQuestionRequest } from "../../../shared/agentRequests";

export type AskQuestionOutcome =
  | {
      outcome: "answered";
      answers: Array<{ questionId: string; selectedOptionIds: string[] }>;
    }
  | { outcome: "skipped" }
  | { outcome: "cancelled" };

/** Agent multiple-choice question: one button per option, plus Skip. */
export function AskQuestionBar({
  request,
  onAnswer,
}: {
  request: CursorAskQuestionRequest;
  onAnswer: (outcome: AskQuestionOutcome) => void;
}) {
  return (
    <div className="permission-bar">
      <strong>{request.title ?? "Agent question"}</strong>
      {request.questions.map((q) => (
        <div key={q.id} style={{ width: "100%" }}>
          <div>{q.prompt}</div>
          <div className="composer-actions">
            {q.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="btn"
                onClick={() =>
                  onAnswer({
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
      <button type="button" className="btn" onClick={() => onAnswer({ outcome: "skipped" })}>
        Skip
      </button>
    </div>
  );
}
