const MAX_STEM = 60;

/** Default `.md` name from the message's first line (markdown markers stripped), else `message.md`. */
export function markdownFileName(text: string): string {
  const firstLine = text.split("\n").find((line) => line.trim()) ?? "";
  const stem = firstLine
    .replace(/[#*_`<>[\]()!~|]/g, "")
    .replace(/[\\/:"?\x00-\x1f\s]+/g, " ")
    .trim()
    .slice(0, MAX_STEM)
    .replace(/[. ]+$/, "");
  return `${stem || "message"}.md`;
}
