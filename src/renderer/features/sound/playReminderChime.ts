/** Two rising double-beeps (A5 → E6, twice), about 0.8 s. */
const BEEPS = [
  { at: 0, hz: 880 },
  { at: 0.15, hz: 1318.5 },
  { at: 0.45, hz: 880 },
  { at: 0.6, hz: 1318.5 },
];
const BEEP_S = 0.12;
const ATTACK_S = 0.008;
/** Full volume until here, then a fast fade: a beep, not a blip. */
const HOLD_S = 0.07;
const VOLUME = 0.22;
/** Fundamental plus soft 2nd and 3rd harmonics: brighter than a sine, gentler than a square. */
const HARMONICS = [0, 1, 0.25, 0.08];

/** Schedule the reminder chime on `context` (a live or offline one), starting at `at`. */
export function playReminderChime(context: BaseAudioContext, at = context.currentTime): void {
  const wave = context.createPeriodicWave(new Float32Array(HARMONICS.length), new Float32Array(HARMONICS));
  const master = context.createGain();
  master.gain.value = VOLUME;
  master.connect(context.destination);
  for (const beep of BEEPS) {
    const start = at + beep.at;
    // Exponential ramps from near-silence avoid clicks at each edge.
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(1, start + ATTACK_S);
    envelope.gain.setValueAtTime(1, start + HOLD_S);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + BEEP_S);
    envelope.connect(master);
    const tone = context.createOscillator();
    tone.setPeriodicWave(wave);
    tone.frequency.value = beep.hz;
    tone.connect(envelope);
    tone.start(start);
    tone.stop(start + BEEP_S + 0.01);
  }
}
