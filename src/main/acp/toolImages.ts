import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ToolCallUpdate } from "@agentclientprotocol/sdk";
import { storeImage } from "../images/storeImage";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * Save the images a tool returned or viewed, so the transcript can show what the agent saw.
 * Claude's Read and Codex image generation send base64 image blocks; Codex view_image
 * only links the local file, so read-kind links to image files are copied too.
 */
export function toolImages(tool: ToolCallUpdate): string[] {
  const names: string[] = [];
  for (const entry of tool.content ?? []) {
    if (entry.type !== "content") continue;
    const block = entry.content;
    const name =
      block.type === "image" && block.data
        ? storeImage(Buffer.from(block.data, "base64"), block.mimeType)
        : block.type === "resource_link" && tool.kind === "read"
          ? storeLinkedImage(block.uri)
          : null;
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

function storeLinkedImage(uri: string): string | null {
  try {
    const file = uri.startsWith("file:") ? fileURLToPath(uri) : uri;
    const mimeType = MIME_TYPES[path.extname(file).toLowerCase()];
    if (!mimeType || !path.isAbsolute(file)) return null;
    return storeImage(readFileSync(file), mimeType);
  } catch {
    return null;
  }
}
