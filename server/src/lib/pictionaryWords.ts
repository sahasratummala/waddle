export const PICTIONARY_WORDS = [
  "feather", "beak", "webbed feet", "egg", "nest", "pond", "lily pad",
  "bread", "wing", "cattail", "flock", "sunrise", "water ripple", "bucket",
  "hat", "umbrella", "leaf", "acorn", "mushroom", "flower", "tree",
  "bridge", "fountain", "bench", "fish", "frog", "turtle", "boat",
  "lighthouse", "island", "mountain", "river", "rain", "kite", "rainbow",
  "cloud", "sun", "butterfly", "apple", "book", "pencil", "backpack",
  "headphones", "glasses", "bow tie", "crown", "key", "bell", "star",
  "bicycle", "goose", "puddle",
];

export function randomPictionaryWord(): string {
  return PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)];
}
