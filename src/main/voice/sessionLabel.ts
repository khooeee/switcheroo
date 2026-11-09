import type { Session } from "../../shared/session";
import { clipText } from "../../shared/clipText";

const URL_RE = /https?:\/\/[^\s<>"']+/gi;
const PATH_RE = /(?<![\w.])~?\/[\w.-]+(?:\/[\w.-]+)+\/?/g;
const GITHUB_REF_RE = /^\/[^/]+\/([^/]+)\/(pull|issues)\/(\d+)/;

/** A URL as a few words: "switcheroo PR 18", "docs.google.com link". */
function spokenUrl(raw: string): string {
  try {
    const url = new URL(raw.replace(/[.,;:!?)\]]+$/u, ""));
    const host = url.hostname.replace(/^www\./, "");
    const ref = host === "github.com" ? GITHUB_REF_RE.exec(url.pathname) : null;
    if (ref) return `${ref[1]} ${ref[2] === "pull" ? "PR" : "issue"} ${ref[3]}`;
    return `${host} link`;
  } catch {
    return "a link";
  }
}

/** The whole title as one speakable line: URLs as words, paths as their last part, no markdown marks. */
export function sessionLabel(session: Session): string {
  const spoken = session.title
    .replace(URL_RE, spokenUrl)
    .replace(PATH_RE, (filePath) => filePath.split("/").filter(Boolean).pop() ?? filePath)
    .replace(/[`*]/g, "")
    .replace(/_/g, " ")
    .split("\n")
    .map((line) => line.replace(/^\s*[#>-]+\s*/, "").trim())
    .filter(Boolean)
    .join(", ");
  return clipText(spoken || "Untitled", 160);
}
