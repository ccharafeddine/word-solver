/** The Guess Helper tab: the board of guesses, the best next guess and the words left. */
import type { Words } from './solver';
import { fromColours, type Colour, type GuessScore } from '../words/clues';
import type { TourDemo } from '../tutorial/lessons';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
type Status = (text: string, kind?: '' | 'ok' | 'bad' | 'thinking') => void;
export interface Row { word: string; colours: Colour[] }
interface Snap { rows: Row[]; only: boolean; input: string }
interface Answer { count: number; likely: { word: string; chance: number }[]; best: GuessScore[] }

const KEY = 'word-solver-guess';
const pct = (x: number) => (x >= 0.995 ? '100%' : x < 0.001 ? '<0.1%' : x < 0.1 ? (x * 100).toFixed(1) + '%' : Math.round(x * 100) + '%');

export class GuessTab {
  rows: Row[] = [];
  private only = $<HTMLInputElement>('g-only');
  private input = $<HTMLInputElement>('g-input');

  constructor(private words: Words, private status: Status) {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Snap>;
      if (Array.isArray(s.rows)) this.rows = s.rows.filter((r) => /^[a-z]{5}$/.test(r.word) && Array.isArray(r.colours) && r.colours.length === 5).slice(0, 6);
      this.only.checked = s.only === true;
    } catch { /* start fresh */ }
    $('g-form').onsubmit = (e) => { e.preventDefault(); void this.addTyped(); };
    this.input.oninput = () => { this.input.value = this.input.value.replace(/[^a-z]/gi, '').toLowerCase(); $('g-warn').textContent = ''; };
    $('g-undo').onclick = () => { this.rows.pop(); this.changed(); };
    $('g-clear').onclick = () => { this.rows = []; this.changed(); };
    this.only.onchange = () => this.changed();
    this.render();
  }

  snapshot(): Snap { return { rows: this.rows.map((r) => ({ word: r.word, colours: [...r.colours] })), only: this.only.checked, input: this.input.value }; }
  restore(s: Snap) { this.rows = s.rows; this.only.checked = s.only; this.input.value = s.input; this.render(); }
  save() { localStorage.setItem(KEY, JSON.stringify({ rows: this.rows, only: this.only.checked })); }

  private changed() { this.save(); this.render(); }

  async addTyped() {
    const w = this.input.value.toLowerCase();
    if (!/^[a-z]{5}$/.test(w)) { $('g-warn').textContent = 'A guess needs exactly 5 letters.'; return; }
    if (this.rows.length >= 6) { $('g-warn').textContent = 'That\'s 6 guesses: press Undo or New puzzle.'; return; }
    const known = await this.words.ask({ kind: 'check', word: w });
    $('g-warn').textContent = known === false ? `"${w.toUpperCase()}" isn't in the word list, but it's added anyway.` : '';
    this.play(w);
  }

  /** Add a guess with all-gray tiles for the player to colour in. */
  play(word: string) {
    if (this.rows.length >= 6) return;
    this.rows.push({ word, colours: [0, 0, 0, 0, 0] });
    this.input.value = '';
    this.changed();
  }

  render() {
    const board = $('board');
    board.replaceChildren();
    const names = ['gray', 'yellow', 'green'];
    this.rows.forEach((r, ri) => {
      const row = document.createElement('div');
      row.className = 'board-row';
      [...r.word].forEach((c, i) => {
        const b = document.createElement('button');
        b.className = `tile big c${r.colours[i]}`;
        b.textContent = c.toUpperCase();
        b.setAttribute('aria-label', `Guess ${ri + 1}, letter ${i + 1}: ${c.toUpperCase()}, ${names[r.colours[i]]}. Click to change.`);
        b.onclick = () => { r.colours[i] = ((r.colours[i] + 1) % 3) as Colour; this.changed(); board.querySelectorAll('button')[ri * 5 + i]?.focus(); };
        b.oncontextmenu = (e) => { e.preventDefault(); r.colours[i] = ((r.colours[i] + 2) % 3) as Colour; this.changed(); };
        row.append(b);
      });
      board.append(row);
    });
    for (let k = this.rows.length; k < 6; k++) {
      const row = document.createElement('div');
      row.className = 'board-row empty';
      for (let i = 0; i < 5; i++) { const t = document.createElement('span'); t.className = 'tile big blank'; row.append(t); }
      board.append(row);
    }
    ($('g-undo') as HTMLButtonElement).disabled = !this.rows.length;
    void this.solve();
  }

  private async solve() {
    this.status('Thinking…', 'thinking');
    let a: Answer | null;
    try {
      a = await this.words.ask({ kind: 'guess', clues: this.rows.map((r) => ({ guess: r.word, pattern: fromColours(r.colours) })), onlyAnswers: this.only.checked }) as Answer | null;
    } catch (e) { this.status(`Could not work it out: ${(e as Error).message}`, 'bad'); return; }
    if (!a) return;
    const solved = this.rows.length && this.rows[this.rows.length - 1].colours.every((c) => c === 2);
    if (solved) this.status(`Solved in ${this.rows.length}! 🎉`, 'ok');
    else if (!a.count) this.status('No word fits all these colours. Check that each tile matches the game.', 'bad');
    else if (a.count === 1) this.status(`It must be ${a.likely[0].word.toUpperCase()}.`, 'ok');
    else if (!this.rows.length) this.status('Start with one of the best first guesses, or type the word you already played.');
    else this.status(`${a.count.toLocaleString()} words still fit.`, 'ok');
    $('g-count').textContent = `${a.count.toLocaleString()} word${a.count === 1 ? '' : 's'}`;
    const left = $('g-left');
    left.replaceChildren(...a.likely.map((x) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.innerHTML = `<b class="mono"></b> <small></small>`;
      b.querySelector('b')!.textContent = x.word.toUpperCase();
      b.querySelector('small')!.textContent = pct(x.chance);
      b.title = 'Play this word';
      b.onclick = () => this.play(x.word);
      return b;
    }));
    if (a.count > a.likely.length) left.append(Object.assign(document.createElement('span'), { className: 'muted', textContent: `+ ${(a.count - a.likely.length).toLocaleString()} more` }));
    const body = $('g-best');
    body.replaceChildren(...(solved ? [] : a.best).map((g, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><button class="link mono"></button></td><td class="num"></td><td class="num"></td><td class="num"></td><td></td>`;
      const btn = tr.querySelector('button')!;
      btn.textContent = g.word.toUpperCase();
      btn.onclick = () => this.play(g.word);
      btn.setAttribute('aria-label', `Play ${g.word.toUpperCase()}`);
      const td = tr.querySelectorAll('td');
      td[1].textContent = `${g.bits.toFixed(2)} bits`;
      td[2].textContent = g.left < 10 ? g.left.toFixed(1) : Math.round(g.left).toLocaleString();
      td[3].textContent = g.chance ? pct(g.chance) : '–';
      td[4].innerHTML = i === 0 ? '<span class="badge">Best</span>' : '';
      return tr;
    }));
  }

  demo(id: TourDemo) {
    this.only.checked = false;
    if (id === 'g-board' || id === 'g-best' || id === 'g-left') this.rows = [{ word: 'tares', colours: [2, 0, 0, 1, 0] }];
    if (id === 'g-double') this.rows = [{ word: 'speed', colours: [2, 0, 0, 2, 2] }];
    this.render();
  }

  onKey(e: KeyboardEvent): boolean {
    if (e.key === '/') { this.input.focus(); return true; }
    return false;
  }
}
