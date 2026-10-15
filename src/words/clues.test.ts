import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { feedback, toColours, fromColours, filterWords, answerWeight, bestGuesses, scoreGuess, ALL_GREEN } from './clues';

const col = (g: string, a: string) => toColours(feedback(g, a)).join('');

describe('feedback colours', () => {
  it('greens, yellows and grays', () => {
    expect(col('crane', 'crane')).toBe('22222');
    expect(feedback('crane', 'crane')).toBe(ALL_GREEN);
    expect(col('crane', 'trace')).toBe('12202');
    expect(col('abcde', 'fghij')).toBe('00000');
  });
  it('repeated letters: greens use copies first, then yellows left to right', () => {
    expect(col('speed', 'shred')).toBe('20022'); // second E green, first E gray
    expect(col('eerie', 'there')).toBe('10102'); // two Es in THERE: one yellow, one green
    expect(col('llama', 'hello')).toBe('11000'); // HELLO has two Ls, both yellow
    expect(col('allee', 'apple')).toBe('21002');
    expect(col('geese', 'eagle')).toBe('11002');
    expect(col('robot', 'floor')).toBe('11020');
  });
  it('round-trips colours', () => {
    for (let p = 0; p < 243; p++) expect(fromColours(toColours(p))).toBe(p);
  });
});

describe('filtering', () => {
  const words = ['shred', 'speed', 'spend', 'sheds', 'creed', 'steed'];
  it('keeps exactly the words that would give the same colours', () => {
    const left = filterWords(words, [{ guess: 'speed', pattern: feedback('speed', 'shred') }]);
    expect(left).toEqual(['shred']);
  });
  it('a gray repeat means "no more copies", not "none"', () => {
    // EERIE vs THERE: E is in the word, so words without E must go.
    const left = filterWords(['there', 'three', 'other', 'tiger'], [{ guess: 'eerie', pattern: feedback('eerie', 'there') }]);
    expect(left).toContain('there');
    expect(left).not.toContain('tiger');
  });
  it('every answer survives its own clues (whole list, random games)', () => {
    const rows = readFileSync('public/data/words5.txt', 'utf-8').trim().split('\n').map((l) => l.split(' ')[0]);
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let k = 0; k < 40; k++) {
      const ans = rows[Math.floor(rnd() * rows.length)];
      const clues = [0, 1, 2].map(() => { const g = rows[Math.floor(rnd() * rows.length)]; return { guess: g, pattern: feedback(g, ans) }; });
      const left = filterWords(rows, clues);
      expect(left).toContain(ans);
      for (const w of left) for (const c of clues) expect(feedback(c.guess, w)).toBe(c.pattern);
    }
  });
});

describe('best guess', () => {
  it('weights: common words near 1, rare near 0', () => {
    expect(answerWeight(5)).toBeGreaterThan(0.99);
    expect(answerWeight(0)).toBeLessThan(0.01);
  });
  it('entropy is log2(n) for a guess that splits n equal words apart', () => {
    const s = scoreGuess('abcde', ['abcde', 'fbcde', 'agcde', 'abhde'], [1, 1, 1, 1], 4);
    expect(s.bits).toBeCloseTo(2, 9);
    expect(s.chance).toBeCloseTo(0.25);
    expect(s.left).toBeCloseTo(0.75);
  });
  it('a guess that tells you nothing scores 0 bits', () => {
    expect(scoreGuess('zzzzz', ['abcde', 'fghij'], [1, 1], 2).bits).toBe(0);
  });
  it('prefers the guess that splits the list better', () => {
    const cands = ['hatch', 'match', 'patch', 'latch', 'batch'];
    const best = bestGuesses(cands, [1, 1, 1, 1, 1], ['hatch', 'match', 'pombl', 'zzzzz'], 4);
    expect(best[0].word).toBe('pombl'); // tests P, M and B together
    expect(best[best.length - 1].word).toBe('zzzzz');
  });
});
