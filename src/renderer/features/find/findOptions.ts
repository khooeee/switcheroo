export interface FindOptions {
  matchCase: boolean;
  wholeWord: boolean;
}

let options: FindOptions = { matchCase: false, wholeWord: false };
const listeners = new Set<() => void>();

/** Find-bar toggles; kept for the app's lifetime so they survive closing the bar. */
export const findOptions = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): FindOptions {
    return options;
  },

  toggle(key: keyof FindOptions): void {
    options = { ...options, [key]: !options[key] };
    listeners.forEach((listener) => listener());
  },
};
