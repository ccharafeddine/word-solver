/**
 * The five-letter guessing game: colour feedback, filtering and the best next
 * guess by information (entropy), weighted by how common each word is.
 *
 * Colours: 0 = gray (not in the word, or no more copies), 1 = yellow (in the
 * word, wrong spot), 2 = green (right spot). A pattern is the five colours as
 * one base-3 number, first letter lowest: 0..242.
 */
export type Colour = 0 | 1 | 2;
export const ALL_GREEN = 242;

/** Colours for `guess` if the answer is `answer`. Repeated letters work like
 * the real game: greens first, then yellows left to right while copies remain. */
export function feedback(guess: string, answer: string): number {
  const left = new Uint8Array(26);
  const col = [0, 0, 0, 0, 0];
  for (let i = 0; i < 5; i++) {
    if (guess.charCodeAt(i) === answer.charCodeAt(i)) col[i] = 2;
    else left[answer.charCodeAt(i) - 97]++;
  }
  for (let i = 0; i < 5; i++) {
    if (col[i]) continue;
    const c = guess.charCodeAt(i) - 97;
    if (left[c]) { col[i] = 1; left[c]--; }
  }
  return col[0] + 3 * col[1] + 9 * col[2] + 27 * col[3] + 81 * col[4];
}

export const toColours = (p: number): Colour[] => [0, 1, 2, 3, 4].map((i) => (Math.floor(p / 3 ** i) % 3) as Colour);
export const fromColours = (c: readonly Colour[]): number => c.reduce<number>((s, x, i) => s + x * 3 ** i, 0);

export interface Clue { guess: string; pattern: number }

/** Words that would have given exactly these colours for every guess so far. */
export const filterWords = (words: readonly string[], clues: readonly Clue[]) =>
  words.filter((w) => clues.every((c) => feedback(c.guess, w) === c.pattern));

/** Turn a Zipf frequency (wordfreq's 0-8 scale) into a 0-1 chance of being a
 * puzzle answer: common words near 1, rare ones near 0 (an S-curve). */
export const answerWeight = (zipf: number) => 1 / (1 + Math.exp(-3 * (zipf - 2.9)));

export interface GuessScore {
  word: string;
  /** Expected information in bits: higher narrows the list more. */
  bits: number;
  /** Chance this guess is the answer itself. */
  chance: number;
  /** Expected number of words left after this guess. */
  left: number;
}

/** Score one guess against weighted candidates. */
export function scoreGuess(guess: string, cands: readonly string[], weights: readonly number[], total: number, counts = new Float64Array(243), sizes = new Uint32Array(243)): GuessScore {
  counts.fill(0); sizes.fill(0);
  let self = 0;
  for (let i = 0; i < cands.length; i++) {
    const p = feedback(guess, cands[i]);
    counts[p] += weights[i]; sizes[p]++;
    if (p === ALL_GREEN) self = weights[i];
  }
  let bits = 0, left = 0;
  for (let p = 0; p < 243; p++) {
    if (!counts[p]) continue;
    const q = counts[p] / total;
    bits -= q * Math.log2(q);
    left += q * (p === ALL_GREEN ? 0 : sizes[p]);
  }
  return { word: guess, bits, chance: self / total, left };
}

/** Rank guesses: the most information first, with a nudge toward guesses that
 * could win right now (as in 3Blue1Brown's approach). Candidates always count
 * as guesses; when the search would be huge, other guesses are pre-picked by
 * how many common letters they test. */
export function bestGuesses(cands: readonly string[], weights: readonly number[], guesses: readonly string[], top = 10, budget = 6e6): GuessScore[] {
  if (!cands.length) return [];
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let pool = guesses;
  if (cands.length * guesses.length > budget) {
    const n = Math.max(50, Math.floor(budget / cands.length));
    const freq = new Float64Array(26);
    cands.forEach((w, i) => new Set(w).forEach((c) => (freq[c.charCodeAt(0) - 97] += weights[i])));
    const cover = (w: string) => [...new Set(w)].reduce((s, c) => s + freq[c.charCodeAt(0) - 97], 0);
    const set = new Set(cands);
    pool = [...guesses].filter((g) => !set.has(g)).sort((a, b) => cover(b) - cover(a)).slice(0, n);
    pool = [...new Set([...pool, ...cands.slice(0, n)])];
  }
  const counts = new Float64Array(243), sizes = new Uint32Array(243);
  const s = pool.map((g) => scoreGuess(g, cands, weights, total, counts, sizes));
  // A guess that might be the answer is worth a little more: it can end the game now.
  const value = (x: GuessScore) => x.bits + x.chance * 1.5;
  return s.sort((a, b) => value(b) - value(a) || a.word.localeCompare(b.word)).slice(0, top);
}
