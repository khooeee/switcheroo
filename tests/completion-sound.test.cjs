const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function fixture(initial = true) {
  const window = new EventTarget();
  let complete;
  let cleanup;
  const sounds = [];
  const settings = {
    theme: 'dark', zenMode: true, soundEnabled: initial, railWidth: 160, composerHeight: 72,
    lastAgent: 'claude', lastCwd: '', lastSwitcherooAware: false,
  };
  window.switcheroo = {
    onPromptComplete(callback) {
      complete = callback;
      return () => { complete = undefined; };
    },
    async updateSettings(patch) {
      Object.assign(settings, patch);
      return { ...settings };
    },
  };
  class Audio {
    muted = false;
    paused = true;
    currentTime = 0;
    plays = 0;
    constructor() { sounds.push(this); }
    play() { this.plays++; this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const cacheModule = {
    getAppSettingsCache: () => settings,
    replaceAppSettingsCache: (next) => {
      Object.assign(settings, next);
      window.dispatchEvent(new CustomEvent('switcheroo:settings-changed', { detail: settings }));
    },
    patchAppSettings: async (patch) => {
      Object.assign(settings, patch);
      await window.switcheroo.updateSettings(patch);
      window.dispatchEvent(new CustomEvent('switcheroo:settings-changed', { detail: settings }));
      return { ...settings };
    },
    subscribeAppSettings: (listener) => {
      window.addEventListener('switcheroo:settings-changed', listener);
      return () => window.removeEventListener('switcheroo:settings-changed', listener);
    },
  };
  function load(name, preference) {
    const exports = {};
    const source = fs.readFileSync(path.join(__dirname, '../src/renderer/features/sound', name + '.ts'), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    vm.runInNewContext(outputText, { exports, window, Event, CustomEvent, Audio, DOMException, console,
      require(name) {
        if (name === 'react') return { useEffect: (effect) => { cleanup = effect(); } };
        if (name === './soundPreference') return { soundPreference: preference };
        if (name === '../settings/appSettingsCache') return cacheModule;
        if (name.endsWith('.mp3')) return { default: 'done.mp3' };
        throw new Error('Unexpected import ' + name);
      },
    });
    return exports;
  }
  const playerPreference = load('soundPreference').soundPreference;
  playerPreference.hydrate(initial);
  load('useCompletionSound', playerPreference).useCompletionSound();
  return { sounds, playerPreference,
    menuPreference: load('soundPreference').soundPreference,
    complete: () => complete?.(), cleanup: () => cleanup(),
  };
}

test('turning sound off stops playback and suppresses future completions across module reloads', async () => {
  const f = fixture(true);
  const sound = f.sounds[0];
  f.complete();
  assert.equal(sound.plays, 1);
  assert.equal(sound.paused, false);
  f.menuPreference.toggle();
  await Promise.resolve();
  assert.equal(f.playerPreference.getSnapshot(), false);
  assert.equal(sound.muted, true);
  assert.equal(sound.paused, true);
  f.complete();
  assert.equal(sound.plays, 1);
  f.menuPreference.toggle();
  await Promise.resolve();
  f.complete();
  assert.equal(sound.muted, false);
  assert.equal(sound.plays, 2);
  f.cleanup();
  assert.equal(sound.muted, true);
  assert.equal(sound.paused, true);
  f.complete();
  assert.equal(sound.plays, 2);
});

test('saved off preference is respected on startup and rechecked before every completion', async () => {
  const f = fixture(false);
  const sound = f.sounds[0];
  f.complete();
  assert.equal(sound.plays, 0);
  f.menuPreference.toggle();
  await Promise.resolve();
  f.complete();
  assert.equal(sound.plays, 1);
  f.cleanup();
});
