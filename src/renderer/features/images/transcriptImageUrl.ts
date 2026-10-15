import { TRANSCRIPT_IMAGE_SCHEME } from "../../../shared/transcriptImageScheme";

/** URL for a saved tool image (served by installImageProtocol in main). */
export function transcriptImageUrl(name: string): string {
  return `${TRANSCRIPT_IMAGE_SCHEME}://images/${encodeURIComponent(name)}`;
}
