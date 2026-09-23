const STORAGE_KEY = "switcheroo.sound";
const CHANGE_EVENT = "switcheroo:sound-changed";
let enabled = true;

function readEnabled(): boolean {
  try {
    enabled = localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    // Keep the session's choice if storage is unavailable.
  }
  return enabled;
}

export const soundPreference = {
  getSnapshot: readEnabled,
  subscribe(listener: () => void): () => void {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) listener();
    };
    window.addEventListener(CHANGE_EVENT, listener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  toggle(): void {
    enabled = !readEnabled();
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch {
      // Keep the choice for this session even if it cannot be saved.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  },
};
