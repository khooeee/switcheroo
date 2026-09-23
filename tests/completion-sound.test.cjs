const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function fixture(initial = 'on') {
  const storage = new Map([['switcheroo.sound', initial]]);
  const window = new EventTarget();
  let complete;
  let cleanup;
  const sounds = [];
  window.switcheroo = { onPromptComplete(callback) {
    complete = callback;
    return () => { complete = undefined; };
  } };
  class Audio {
    muted = false;
    paused = true;
    currentTime = 0;
    plays = 0;
    constructor() { sounds.push(this); }
    play() { this.plays++; this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  function load(name, preference) {
    const exports = {};
    const source = fs.readFileSync(path.join(__dirname, '../src/renderer/features/sound', name + '.ts'), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    vm.runInNewContext(outputText, { exports, window, Event, Audio, DOMException, console,
      localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
      require(name) {
        if (name === 'react') return { useEffect: (effect) => { cleanup = effect(); } };
        if (name === './soundPreference') return { soundPreference: preference };
        if (name.endsWith('.mp3')) return { default: 'done.mp3' };
        throw new Error('Unexpected import ' + name);
      },
    });
    return exports;
  }
  const playerPreference = load('soundPreference').soundPreference;
  load('useCompletionSound', playerPreference).useCompletionSound();
  return { storage, sounds, playerPreference,
    menuPreference: load('soundPreference').soundPreference,
    complete: () => complete?.(), cleanup: () => cleanup(),
  };
}

test('turning sound off stops playback and suppresses future completions across module reloads', () => {
  const f = fixture();
  const sound = f.sounds[0];
  f.complete();
  assert.equal(sound.plays, 1);
  assert.equal(sound.paused, false);
  f.menuPreference.toggle();
  assert.equal(f.playerPreference.getSnapshot(), false);
  assert.equal(sound.muted, true);
  assert.equal(sound.paused, true);
  f.complete();
  assert.equal(sound.plays, 1);
  f.menuPreference.toggle();
  f.complete();
  assert.equal(sound.muted, false);
  assert.equal(sound.plays, 2);
  f.cleanup();
  assert.equal(sound.muted, true);
  assert.equal(sound.paused, true);
  f.complete();
  assert.equal(sound.plays, 2);
});

test('saved off preference is respected on startup and rechecked before every completion', () => {
  const f = fixture('off');
  const sound = f.sounds[0];
  f.complete();
  assert.equal(sound.plays, 0);
  f.menuPreference.toggle();
  f.complete();
  assert.equal(sound.plays, 1);
  f.storage.set('switcheroo.sound', 'off');
  f.complete();
  assert.equal(sound.plays, 1);
  assert.equal(sound.muted, true);
  f.cleanup();
});
