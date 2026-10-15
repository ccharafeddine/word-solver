/** The word finder: tiles plus blanks, filters, scores and grouping. */
import type { Trie } from './trie';

/** Classic letter-tile points (a fact about the tiles, not anyone's word list). */
export const POINTS: Record<string, number> = {
  a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3,
  n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10,
};

/** Points for a word; letters played from a blank (bit set in `wild`) score 0. */
export const wordScore = (w: string, wild = 0) => [...w].reduce((s, c, i) => s + (wild >> i & 1 ? 0 : POINTS[c] ?? 0), 0);

export interface FindQuery {
  /** Your tiles: letters, with ? or space for a blank. */
  tiles: string;
  starts?: string;
  ends?: string;
  contains?: string;
  /** Exact length (0 = any). */
  length?: number;
  /** Shortest length to show. */
  minLength?: number;
}
export interface Found { word: string; score: number; wild: number }
export interface Group { length: number; words: Found[] }

const clean = (s = '') => s.toLowerCase().replace(/[^a-z]/g, '');

/** Count tiles; returns letter counts and the number of blanks. */
export function parseTiles(tiles: string): { counts: Uint8Array; blanks: number } {
  const counts = new Uint8Array(26);
  let blanks = 0;
  for (const ch of tiles.toLowerCase()) {
    if (ch >= 'a' && ch <= 'z') counts[ch.charCodeAt(0) - 97]++;
    else if (ch === '?' || ch === ' ' || ch === '*' || ch === '_') blanks++;
  }
  return { counts, blanks };
}

/**
 * Find words. Letters in starts/ends/contains are treated as already on the
 * board: you don't need them in your tiles. With no tiles at all, every word
 * that fits the filters is listed.
 */
export function findWords(trie: Trie, all: readonly string[], q: FindQuery, limit = 2000): { groups: Group[]; total: number } {
  const starts = clean(q.starts), ends = clean(q.ends), contains = clean(q.contains);
  const fixed = starts + ends + contains;
  const len = q.length ?? 0, minLen = Math.max(2, q.minLength ?? 2);
  const { counts, blanks } = parseTiles(q.tiles);
  const haveTiles = counts.some(Boolean) || blanks > 0;
  const fits = (w: string) => w.length >= minLen && (!len || w.length === len) && w.startsWith(starts) && w.endsWith(ends) && w.includes(contains) && (!fixed || w.length >= fixed.length);
  const out = new Map<string, Found>();
  const add = (word: string, wild: number) => {
    const prev = out.get(word);
    const f = { word, wild, score: wordScore(word, wild) };
    if (!prev || f.score > prev.score) out.set(word, f);
  };
  if (!haveTiles) {
    for (const w of all) if (fits(w)) add(w, 0);
  } else {
    // Search with tiles + board letters, then keep words whose board letters sit where the filters say.
    const pool = counts.slice();
    for (const c of fixed) pool[c.charCodeAt(0) - 97]++;
    const maxLen = len || 15;
    trie.fromTiles(pool, blanks, (w) => {
      if (!fits(w)) return;
      const m = boardSpots(w, starts, ends, contains);
      if (!m) return;
      // Letters on board positions are free; the rest must come from tiles or blanks.
      const need = counts.slice();
      let b = blanks, mask = 0;
      for (let i = 0; i < w.length; i++) {
        if (m[i]) continue;
        const c = w.charCodeAt(i) - 97;
        if (need[c]) need[c]--; else if (b) { b--; mask |= 1 << i; } else return;
      }
      add(w, mask);
    }, maxLen);
  }
  const words = [...out.values()].sort((a, b) => b.word.length - a.word.length || b.score - a.score || a.word.localeCompare(b.word));
  const total = words.length;
  const groups = new Map<number, Found[]>();
  for (const f of words.slice(0, limit)) {
    if (!groups.has(f.word.length)) groups.set(f.word.length, []);
    groups.get(f.word.length)!.push(f);
  }
  return { groups: [...groups].map(([length, ws]) => ({ length, words: ws })), total };
}

/** Which letters of `w` are board letters (true), trying each place `contains` can sit. */
function boardSpots(w: string, starts: string, ends: string, contains: string): boolean[] | null {
  const base = Array<boolean>(w.length).fill(false);
  for (let i = 0; i < starts.length; i++) base[i] = true;
  for (let i = 0; i < ends.length; i++) {
    const k = w.length - 1 - i;
    if (base[k]) return null; // starts and ends overlap: needs a longer word
    base[k] = true;
  }
  if (!contains) return base;
  for (let at = w.indexOf(contains); at !== -1; at = w.indexOf(contains, at + 1)) {
    let ok = true;
    for (let i = 0; i < contains.length; i++) if (base[at + i]) { ok = false; break; }
    if (ok) { const m = base.slice(); for (let i = 0; i < contains.length; i++) m[at + i] = true; return m; }
  }
  return null;
}
