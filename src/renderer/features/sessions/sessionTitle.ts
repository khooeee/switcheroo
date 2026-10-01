const ADJECTIVES = [
  "amber",
  "bold",
  "bright",
  "calm",
  "clear",
  "crisp",
  "eager",
  "fair",
  "gentle",
  "glad",
  "golden",
  "happy",
  "keen",
  "kind",
  "lively",
  "lucky",
  "merry",
  "neat",
  "nimble",
  "noble",
  "quick",
  "quiet",
  "rapid",
  "silver",
  "steady",
  "sunny",
  "swift",
  "tidy",
  "vivid",
  "warm",
];

const NOUNS = [
  "badger",
  "brook",
  "cedar",
  "comet",
  "falcon",
  "finch",
  "harbor",
  "heron",
  "island",
  "lark",
  "maple",
  "meadow",
  "otter",
  "pebble",
  "pine",
  "quartz",
  "river",
  "robin",
  "sparrow",
  "summit",
  "trail",
  "willow",
];

function pick(words: string[]): string {
  return words[Math.floor(Math.random() * words.length)] ?? words[0];
}

export function randomSessionTitle(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
}
