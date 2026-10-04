import { expect, test, vi } from "vitest";

type Sound = {
  muted: boolean;
  paused: boolean;
  currentTime: number;
  plays: number;
  play: () => Promise<void>;
  pause: () => void;
};

async function fixture(initial = true) {
  const windowTarget = new EventTarget() as EventTarget & {
    switcheroo: {
      onPromptComplete: (cb: () => void) => () => void;
      updateSettings: (patch: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };
  };
  let complete: (() => void) | undefined;
  let cleanup: (() => void) | undefined;
  const sounds: Sound[] = [];
  const settings = {
    theme: "dark",
    zenMode: true,
    soundEnabled: initial,
    railWidth: 160,
    composerHeight: 72,
    lastAgent: "claude",
    lastCwd: "",
    lastSwitcherooAware: false,
  };

  windowTarget.switcheroo = {
    onPromptComplete(callback) {
      complete = callback;
      return () => {
        complete = undefined;
      };
    },
    async updateSettings(patch) {
      Object.assign(settings, patch);
      return { ...settings };
    },
  };

  class FakeAudio {
    muted = false;
    paused = true;
    currentTime = 0;
    plays = 0;
    preload = "";
    constructor() {
      sounds.push(this);
    }
    play() {
      this.plays++;
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }

  vi.resetModules();
  vi.stubGlobal("window", windowTarget);
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("Event", Event);
  vi.stubGlobal("CustomEvent", CustomEvent);
  vi.stubGlobal("DOMException", DOMException);

  vi.doMock("react", () => ({
    useEffect: (effect: () => () => void) => {
      cleanup = effect();
    },
  }));

  vi.doMock("../src/renderer/features/settings/appSettingsCache", () => ({
    getAppSettingsCache: () => settings,
    replaceAppSettingsCache: (next: typeof settings) => {
      Object.assign(settings, next);
      windowTarget.dispatchEvent(new CustomEvent("switcheroo:settings-changed", { detail: settings }));
    },
    patchAppSettings: async (patch: Partial<typeof settings>) => {
      Object.assign(settings, patch);
      await windowTarget.switcheroo.updateSettings(patch);
      windowTarget.dispatchEvent(new CustomEvent("switcheroo:settings-changed", { detail: settings }));
      return { ...settings };
    },
    subscribeAppSettings: (listener: () => void) => {
      windowTarget.addEventListener("switcheroo:settings-changed", listener);
      return () => windowTarget.removeEventListener("switcheroo:settings-changed", listener);
    },
  }));

  vi.doMock("../../../../assets/done.mp3", () => ({ default: "done.mp3" }));

  const { soundPreference } = await import("../src/renderer/features/sound/soundPreference");
  soundPreference.hydrate(initial);
  const { useCompletionSound } = await import("../src/renderer/features/sound/useCompletionSound");
  useCompletionSound();

  return {
    sounds,
    preference: soundPreference,
    complete: () => complete?.(),
    cleanup: () => cleanup?.(),
  };
}

test("turning sound off stops playback and suppresses future completions", async () => {
  const f = await fixture(true);
  const sound = f.sounds[0]!;
  f.complete();
  expect(sound.plays).toBe(1);
  expect(sound.paused).toBe(false);
  f.preference.toggle();
  await Promise.resolve();
  expect(f.preference.getSnapshot()).toBe(false);
  expect(sound.muted).toBe(true);
  expect(sound.paused).toBe(true);
  f.complete();
  expect(sound.plays).toBe(1);
  f.preference.toggle();
  await Promise.resolve();
  f.complete();
  expect(sound.muted).toBe(false);
  expect(sound.plays).toBe(2);
  f.cleanup();
  expect(sound.muted).toBe(true);
  expect(sound.paused).toBe(true);
  f.complete();
  expect(sound.plays).toBe(2);
});

test("saved off preference is respected on startup and rechecked before every completion", async () => {
  const f = await fixture(false);
  const sound = f.sounds[0]!;
  f.complete();
  expect(sound.plays).toBe(0);
  f.preference.toggle();
  await Promise.resolve();
  f.complete();
  expect(sound.plays).toBe(1);
  f.cleanup();
});
