const pad = (value: number) => String(value).padStart(2, "0");

/** Replace YYYY-MM-DD, HH:MM and H:MM (24-hour local time) with the run's date/time. */
export function formatCronTitle(title: string, at: Date): string {
  const minutes = pad(at.getMinutes());
  return title.replace(/YYYY-MM-DD|HH:MM|H:MM/g, (token) => {
    if (token === "YYYY-MM-DD") {
      return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
    }
    if (token === "HH:MM") return `${pad(at.getHours())}:${minutes}`;
    return `${at.getHours()}:${minutes}`;
  });
}
