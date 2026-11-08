let hasKey = false;
const listeners = new Set<() => void>();
let loaded = false;

function refresh(): void {
  void window.switcheroo.getVoiceKeyInfo().then((info) => {
    hasKey = info.hasKey;
    listeners.forEach((listener) => listener());
  });
}

/** Whether an Inworld key is saved, for `useSyncExternalStore` (the mic hides without one). */
export const voiceKeyPresence = {
  subscribe(listener: () => void): () => void {
    if (!loaded) {
      loaded = true;
      refresh();
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): boolean {
    return hasKey;
  },

  /** Re-read after the key is saved or removed. */
  refresh,
};
