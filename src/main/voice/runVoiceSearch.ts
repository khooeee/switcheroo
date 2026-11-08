import { errorMessage } from "../../shared/errorMessage";
import { appendVoiceLog } from "./appendVoiceLog";
import { clipText } from "./clipText";
import { voiceNoticeText } from "./voiceNoticeText";
import type { VoiceNotices } from "./VoiceNotices";
import { webSearch } from "./webSearch";

/** Search in the background and queue the answer (or failure) as a notice. */
export function runVoiceSearch(key: string, model: string, query: string, depth: "quick" | "deep", notices: VoiceNotices): void {
  appendVoiceLog("tool", { name: "web_search:start", query, depth });
  void webSearch(key, model, query, depth)
    .then(({ answer, sources }) => {
      appendVoiceLog("tool", { name: "web_search:done", query, answer: clipText(answer, 800), sources });
      notices.push(voiceNoticeText.searchResult(query, answer, sources));
    })
    .catch((error) => {
      const message = errorMessage(error);
      appendVoiceLog("error", { error: message, query });
      notices.push(voiceNoticeText.searchFailed(query, message));
    });
}
