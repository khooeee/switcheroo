/** What a due reminder shows, however it reaches the user. */
export type ReminderAlert = {
  title: string;
  subtitle?: string;
  body: string;
  onClick: () => void;
};
