import "./thinking.css";

export function ThinkingIndicator({ label = "Thinking" }: { label?: string }) {
  return (
    <div className="chat-thinking" role="status">
      <span className="chat-thinking-label">{label}</span>
    </div>
  );
}
