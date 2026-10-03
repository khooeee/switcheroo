import "./thinking.css";

export function ThinkingIndicator({
  label = "Thinking",
  onActivate,
}: {
  label?: string;
  onActivate?: () => void;
}) {
  return (
    <div
      className={`chat-thinking${onActivate ? " activatable" : ""}`}
      role="status"
      onClick={onActivate}
    >
      <span className="chat-thinking-label">{label}</span>
    </div>
  );
}
