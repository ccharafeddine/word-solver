/**
 * A compact letter tree (trie) for fast "which words can I make from these
 * tiles" searches. Nodes live in flat typed arrays so it builds quickly and can
 * be saved and loaded as plain numbers.
 */
export class Trie {
  /** first child of each node, next sibling, letter (0-25), 1 if a word ends here. */
  constructor(public child: Int32Array, public next: Int32Array, public letter: Uint8Array, public end: Uint8Array, public size: number) {}

  /** Build from words sorted alphabetically (lowercase a-z). */
  static build(words: readonly string[]): Trie {
    let cap = 1 << 16;
    let child = new Int32Array(cap).fill(-1), next = new Int32Array(cap).fill(-1), letter = new Uint8Array(cap), end = new Uint8Array(cap);
    let size = 1;
    const grow = () => {
      cap *= 2;
      const g = <T extends Int32Array | Uint8Array>(a: T, fill: number) => { const b = new (a.constructor as new (n: number) => T)(cap); b.fill(fill); b.set(a); return b; };
      child = g(child, -1); next = g(next, -1); letter = g(letter, 0); end = g(end, 0);
    };
    for (const w of words) {
      let n = 0;
      for (let i = 0; i < w.length; i++) {
        const c = w.charCodeAt(i) - 97;
        let k = child[n], prev = -1;
        while (k !== -1 && letter[k] < c) { prev = k; k = next[k]; }
        if (k === -1 || letter[k] !== c) {
          if (size >= cap) grow();
          const m = size++;
          letter[m] = c; next[m] = k;
          if (prev === -1) child[n] = m; else next[prev] = m;
          k = m;
        }
        n = k;
      }
      end[n] = 1;
    }
    return new Trie(child.slice(0, size), next.slice(0, size), letter.slice(0, size), end.slice(0, size), size);
  }

  has(word: string): boolean {
    let n = 0;
    for (let i = 0; i < word.length; i++) {
      const c = word.charCodeAt(i) - 97;
      let k = this.child[n];
      while (k !== -1 && this.letter[k] !== c) k = this.next[k];
      if (k === -1) return false;
      n = k;
    }
    return this.end[n] === 1;
  }

  /** Every word made from the tile counts (26 letters) plus `blanks` wild tiles.
   * Calls `found(word, wildMask)`: bit i set means letter i came from a blank. */
  fromTiles(counts: Uint8Array, blanks: number, found: (w: string, wild: number) => void, maxLen = 15) {
    const buf: number[] = [];
    const walk = (n: number, blanksLeft: number, wild: number) => {
      if (n && this.end[n]) found(String.fromCharCode(...buf.map((c) => c + 97)), wild);
      if (buf.length >= maxLen) return;
      for (let k = this.child[n]; k !== -1; k = this.next[k]) {
        const c = this.letter[k];
        if (counts[c]) { counts[c]--; buf.push(c); walk(k, blanksLeft, wild); buf.pop(); counts[c]++; }
        else if (blanksLeft) { buf.push(c); walk(k, blanksLeft - 1, wild | (1 << buf.length - 1)); buf.pop(); }
      }
    };
    walk(0, blanks, 0);
  }
}
