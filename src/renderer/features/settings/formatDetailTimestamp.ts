export function formatDetailTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const time = date.toLocaleTimeString();
  return date < today ? `${date.toLocaleDateString()} ${time}` : time;
}
