/** `conversation.item.create` for a text message in the user role (notices, reconnect context). */
export function voiceUserMessage(text: string) {
  return {
    type: "conversation.item.create",
    item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
  };
}
