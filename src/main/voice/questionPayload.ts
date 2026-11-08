import type { CursorAskQuestionRequest } from "../../shared/agentRequests";

/** An open agent question with the ids `answer_question` needs. */
export function questionPayload(request: CursorAskQuestionRequest) {
  return {
    ...(request.title ? { title: request.title } : {}),
    questions: request.questions.map((question) => ({
      question_id: question.id,
      prompt: question.prompt,
      ...(question.allowMultiple ? { multiple: true } : {}),
      options: question.options.map((option) => ({ option_id: option.id, label: option.label })),
    })),
  };
}
