/**
 * The word worker: loads the word lists, builds the trie (or loads the one
 * saved last time), and answers finder and guess questions off the main thread.
 */
import { Trie } from './words/trie';
import { findWords, type FindQuery } from './words/finder';
import { answerWeight, bestGuesses, filterWords, type Clue } from './words/clues';
import { OPENERS } from './words/openers';

export type Req =
  | { id: number; kind: 'init'; base: string }
  | { id: number; kind: 'find'; q: FindQuery }
  | { id: number; kind: 'guess'; clues: Clue[]; onlyAnswers: boolean }
  | { id: number; kind: 'check'; word: string };
export type Res = { id: number; ok: true; data: unknown } | { id: number; ok: false; error: string };

const DATA_VERSION = 'enable1-wordfreq-v1';
let all: string[] = [];
let trie: Trie | null = null;
let five: string[] = [];
let weights: number[] = [];

async function cachedTrie(build: () => Trie): Promise<Trie> {
  // IndexedDB keeps the built trie between visits, so later starts skip the build.
  try {
    const db = await new Promise<IDBDatabase>((ok, bad) => {
      const r = indexedDB.open('word-solver', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('trie');
      r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error);
    });
    const get = await new Promise<{ child: Int32Array; next: Int32Array; letter: Uint8Array; end: Uint8Array; size: number } | undefined>((ok) => {
      const r = db.transaction('trie').objectStore('trie').get(DATA_VERSION);
      r.onsuccess = () => ok(r.result); r.onerror = () => ok(undefined);
    });
    if (get) return new Trie(get.child, get.next, get.letter, get.end, get.size);
    const t = build();
    db.transaction('trie', 'readwrite').objectStore('trie').put({ child: t.child, next: t.next, letter: t.letter, end: t.end, size: t.size }, DATA_VERSION);
    return t;
  } catch {
    return build();
  }
}

let ready: Promise<{ words: number; five: number; ms: number }> | null = null;
const load = (base: string) => (async () => {
  const t0 = performance.now();
  const get = (f: string) => fetch(new URL(f, base)).then((r) => { if (!r.ok) throw new Error(`could not load ${f}`); return r.text(); });
  const [enable, w5] = await Promise.all([get('enable.txt'), get('words5.txt')]);
  all = enable.split('\n').filter(Boolean);
  for (const line of w5.split('\n')) {
    const [w, z] = line.split(' ');
    if (w) { five.push(w); weights.push(answerWeight(Number(z))); }
  }
  // Most likely answers first, so short lists read well.
  const order = five.map((_, i) => i).sort((a, b) => weights[b] - weights[a]);
  five = order.map((i) => five[i]); weights = order.map((i) => weights[i]);
  trie = await cachedTrie(() => Trie.build(all));
  return { words: all.length, five: five.length, ms: Math.round(performance.now() - t0) };
})();

self.onmessage = async (e: MessageEvent<Req>) => {
  const m = e.data;
  try {
    if (m.kind === 'init') ready ??= load(m.base);
    if (!ready) throw new Error('not started');
    const info = await ready;
    let data: unknown;
    if (m.kind === 'init') data = info;
    else if (m.kind === 'find') data = { ...findWords(trie!, all, m.q), info };
    else if (m.kind === 'check') data = trie!.has(m.word.toLowerCase());
    else {
      const idx: number[] = [];
      const left = m.clues.length ? filterWords(five, m.clues) : five;
      const set = new Set(left);
      five.forEach((w, i) => set.has(w) && idx.push(i));
      const cands = idx.map((i) => five[i]), wts = idx.map((i) => weights[i]);
      const total = wts.reduce((a, b) => a + b, 0) || 1;
      const guesses = m.onlyAnswers ? cands : five;
      const best = !m.clues.length ? OPENERS : bestGuesses(cands, wts, guesses, 10);
      data = { count: cands.length, likely: cands.slice(0, 60).map((w, i) => ({ word: w, chance: wts[i] / total })), best, info };
    }
    (self as unknown as Worker).postMessage({ id: m.id, ok: true, data } satisfies Res);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id: m.id, ok: false, error: (err as Error).message } satisfies Res);
  }
};
