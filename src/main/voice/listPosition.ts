const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
const NUMBERS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const NOISE = new Set(["the", "number", "session", "no"]);

/** 1-based position for refs like "2", "#2", "number 2", "second", "the third one"; else null. */
export function listPosition(ref: string): number | null {
  const words = ref.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((word) => word && !NOISE.has(word));
  // "the second one"
  if (words.length === 2 && words[1] === "one") words.pop();
  if (words.length !== 1) return null;
  const word = words[0]!;
  if (/^\d{1,3}$/.test(word)) return Number(word);
  const ordinal = ORDINALS.indexOf(word);
  if (ordinal >= 0) return ordinal + 1;
  const number = NUMBERS.indexOf(word);
  return number >= 0 ? number + 1 : null;
}
