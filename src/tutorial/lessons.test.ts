import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { LESSONS, TOUR, loadProgress, GAME_TABS } from './lessons';
import { feedback, toColours } from '../words/clues';
import { Trie } from '../words/trie';
import { findWords } from '../words/finder';

const html = readFileSync('index.html', 'utf-8');
const all = readFileSync('public/data/enable.txt', 'utf-8').split('\n').filter(Boolean);
const trie = Trie.build(all);
const found = (q: Parameters<typeof findWords>[2]) => findWords(trie, all, q).groups.flatMap((g) => g.words.map((w) => w.word));
const lesson = (id: string) => LESSONS.find((l) => l.id === id)!;
const answer = (id: string) => lesson(id).choices[lesson(id).answer];

describe('lessons', () => {
  it('each has one valid answer and a tab', () => {
    for (const l of LESSONS) {
      expect(l.answer).toBeGreaterThanOrEqual(0);
      expect(l.answer).toBeLessThan(l.choices.length);
      expect(GAME_TABS).toContain(l.tab);
    }
  });
  it('the double-letter lesson matches the engine', () => {
    expect(toColours(feedback('speed', 'shred'))[2]).toBe(0);
    expect(answer('doubles')).toBe('Gray');
    expect(lesson('doubles').show).toBe('speed:' + toColours(feedback('speed', 'shred')).join(''));
  });
  it('bits halve the list', () => { expect(answer('bits')).toBe(`About ${80 / 2 ** 3}`); });
  it('the finder lessons match the finder', () => {
    expect(found({ tiles: 'ct?' })).toContain('cat');
    expect(found({ tiles: 'ct?' })).not.toContain('coast');
    expect(answer('blanks')).toBe('CAT');
    const ends = found({ tiles: 'tac', ends: 's' });
    expect(ends).toContain('cats');
    expect(ends).not.toContain('casts');
    expect(ends).not.toContain('scat');
    expect(answer('board')).toBe('CATS');
    expect(found({ tiles: 'rad', ends: 'e' })).toContain('dare');
  });
});

describe('tour', () => {
  it('every step points at something on the page', () => {
    for (const s of TOUR) for (const sel of s.target.split(',')) expect(html, s.id).toContain(`id="${sel.trim().slice(1)}"`);
  });
  it('progress survives junk', () => {
    expect(loadProgress({ getItem: () => '{bad', setItem: () => {} }).lesson).toBe(0);
  });
});
