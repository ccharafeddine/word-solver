import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { Trie } from './trie';
import { findWords, wordScore, parseTiles } from './finder';

let all: string[] = [];
let trie: Trie;
beforeAll(() => {
  all = readFileSync('public/data/enable.txt', 'utf-8').split('\n').filter(Boolean);
  trie = Trie.build(all);
});
const words = (q: Parameters<typeof findWords>[2]) => findWords(trie, all, q).groups.flatMap((g) => g.words.map((w) => w.word));

describe('word list and trie', () => {
  it('ENABLE has 172,823 words and the trie knows each one', () => {
    expect(all.length).toBe(172823);
    for (const w of ['aa', 'zyzzyva', 'quixotic', 'crane', 'retains']) expect(trie.has(w)).toBe(true);
    for (const w of ['crae', 'zzzz', 'retainz', '']) expect(trie.has(w)).toBe(false);
  });
  it('round-trips through its typed arrays (what the cache stores)', () => {
    const t2 = new Trie(trie.child.slice(), trie.next.slice(), trie.letter.slice(), trie.end.slice(), trie.size);
    expect(t2.has('quixotic')).toBe(true);
  });
});

describe('finder', () => {
  it('finds words from tiles, using each tile once', () => {
    const w = words({ tiles: 'tca' });
    expect(w).toEqual(expect.arrayContaining(['act', 'cat', 'ta', 'at']));
    expect(w).not.toContain('tact');
    for (const x of w) {
      const c = parseTiles('tca').counts;
      for (const ch of x) expect(c[ch.charCodeAt(0) - 97]--).toBeGreaterThan(0);
    }
  });
  it('agrees with a slow scan of the whole list', () => {
    const tiles = 'retainsl';
    const slow = all.filter((w) => {
      const c = parseTiles(tiles).counts;
      return [...w].every((ch) => c[ch.charCodeAt(0) - 97]-- > 0);
    });
    expect(new Set(words({ tiles }))).toEqual(new Set(slow));
  });
  it('blanks can be any letter and score 0', () => {
    const r = findWords(trie, all, { tiles: 'ct?' });
    const cat = r.groups.flatMap((g) => g.words).find((w) => w.word === 'cat')!;
    expect(cat.score).toBe(4); // C 3 + A (blank) 0 + T 1
    expect(cat.wild).toBe(0b010);
    expect(words({ tiles: 'retains?' })).toContain('retrains');
  });
  it('filter letters are on the board and do not use tiles', () => {
    expect(words({ tiles: 'tac', ends: 's' })).toContain('cats');
    expect(words({ tiles: 'tac', ends: 's' })).not.toContain('scat');
    expect(words({ tiles: 'ead', starts: 'r' })).toContain('read');
    const ing = words({ tiles: 'clay', ends: 'ing' });
    expect(ing).toContain('lacing');
    for (const w of ing) expect(w.endsWith('ing')).toBe(true);
    expect(words({ tiles: 'ad', contains: 'rn' })).toContain('darn');
  });
  it('length filter and grouping, longest first', () => {
    const r = findWords(trie, all, { tiles: 'retains' });
    expect(r.groups[0].length).toBe(7);
    expect(r.groups[0].words.map((w) => w.word)).toEqual(expect.arrayContaining(['retains', 'nastier', 'retinas']));
    expect(words({ tiles: 'retains', length: 4 }).every((w) => w.length === 4)).toBe(true);
  });
  it('filters alone list every matching word', () => {
    const w = words({ tiles: '', starts: 'qu', ends: 'z' });
    expect(w).toContain('quartz');
  });
  it('scores use the classic tile points', () => {
    expect(wordScore('quiz')).toBe(22);
    expect(wordScore('quiz', 0b1000)).toBe(12);
  });
});
