import { randomBytes } from "node:crypto";
import { bearerAuthorized } from "../control/bearerAuthorized";

const keys = new Map<string, string>();

/**
 * Per-session bearer keys for the MCP endpoint, kept in memory: agents get new ones each launch, a key
 * proves which session is calling, and rotating the iOS token does not cut aware sessions off.
 */
export const mcpSessionKeys = {
  keyFor(sessionId: string): string {
    let key = keys.get(sessionId);
    if (!key) {
      key = randomBytes(24).toString("base64url");
      keys.set(sessionId, key);
    }
    return key;
  },

  matches(sessionId: string, authorization: string | undefined): boolean {
    const key = keys.get(sessionId);
    return !!key && bearerAuthorized(authorization, key);
  },
};
