let context: AudioContext | null = null;

/** Two soft rising sine notes (a fifth apart) that confirm voice is listening. */
export function playVoiceOnChime(): void {
  context ??= new AudioContext();
  void context.resume();
  const now = context.currentTime;
  note(context, 660, now);
  note(context, 990, now + 0.09);
}

function note(ctx: AudioContext, frequency: number, start: number): void {
  const tone = ctx.createOscillator();
  const gain = ctx.createGain();
  tone.type = "sine";
  tone.frequency.value = frequency;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.1, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
  tone.connect(gain).connect(ctx.destination);
  tone.start(start);
  tone.stop(start + 0.3);
}
