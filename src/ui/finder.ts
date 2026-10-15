/** The Word Finder tab: your letters and filters in, words grouped by length out. */
import type { Words } from './solver';
import type { FindQuery, Group } from '../words/finder';
import type { TourDemo } from '../tutorial/lessons';
import { tile } from './tiles';
import { POINTS } from '../words/finder';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
type Status = (text: string, kind?: '' | 'ok' | 'bad' | 'thinking') => void;
const KEY = 'word-solver-finder';
const FIELDS = ['tiles', 'starts', 'ends', 'contains'] as const;
type Snap = Record<(typeof FIELDS)[number], string> & { length: string };

export class FinderTab {
  private timer = 0;
  constructor(private words: Words, private status: Status) {
    const len = $<HTMLSelectElement>('f-length');
    for (let n = 2; n <= 15; n++) len.append(new Option(`${n} letters`, String(n)));
    try { this.restore({ ...this.snapshot(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }); } catch { /* fresh */ }
    for (const f of FIELDS) $(`f-${f}`).addEventListener('input', () => {
      const el = $<HTMLInputElement>(`f-${f}`);
      el.value = el.value.toLowerCase().replace(f === 'tiles' ? /[^a-z? ]/g : /[^a-z]/g, '').replace(/ /g, '?');
      this.changed(150);
    });
    len.onchange = () => this.changed(0);
    $('f-form').onsubmit = (e) => { e.preventDefault(); this.changed(0); };
    $('f-clear').onclick = () => { for (const f of FIELDS.slice(1)) $<HTMLInputElement>(`f-${f}`).value = ''; len.value = '0'; this.changed(0); };
    this.changed(0);
  }

  snapshot(): Snap {
    const s = { length: $<HTMLSelectElement>('f-length').value } as Snap;
    for (const f of FIELDS) s[f] = $<HTMLInputElement>(`f-${f}`).value;
    return s;
  }
  restore(s: Snap) {
    for (const f of FIELDS) $<HTMLInputElement>(`f-${f}`).value = String(s[f] ?? '');
    $<HTMLSelectElement>('f-length').value = String(s.length ?? '0');
    this.changed(0);
  }
  save() { localStorage.setItem(KEY, JSON.stringify(this.snapshot())); }

  private changed(wait: number) {
    clearTimeout(this.timer);
    this.renderRack();
    this.timer = window.setTimeout(() => { this.save(); void this.run(); }, wait);
  }

  private renderRack() {
    const rack = $('f-rack');
    const t = $<HTMLInputElement>('f-tiles').value;
    rack.replaceChildren(...[...t].map((c) => {
      const el = tile(c === '?' ? '' : c, null, 'rack-tile');
      if (c === '?') el.classList.add('wild');
      else el.dataset.pts = String(POINTS[c] ?? '');
      return el;
    }));
  }

  private async run() {
    const s = this.snapshot();
    const q: FindQuery = { tiles: s.tiles, starts: s.starts, ends: s.ends, contains: s.contains, length: Number(s.length) };
    if (!s.tiles && !s.starts && !s.ends && !s.contains) {
      this.status('Type some letters to find words.');
      $('f-results').replaceChildren(); $('f-count').textContent = '';
      return;
    }
    this.status('Searching…', 'thinking');
    let r: { groups: Group[]; total: number } | null;
    try { r = await this.words.ask({ kind: 'find', q }) as typeof r; } catch (e) { this.status(`Search failed: ${(e as Error).message}`, 'bad'); return; }
    if (!r) return;
    const shown = r.groups.reduce((n, g) => n + g.words.length, 0);
    $('f-count').textContent = r.total ? `${r.total.toLocaleString()} word${r.total === 1 ? '' : 's'}${shown < r.total ? `, showing ${shown.toLocaleString()}` : ''}` : '';
    if (!r.total) this.status('No words fit. Try fewer filters or add a blank (?).', 'bad');
    else {
      const top = r.groups.flatMap((g) => g.words).sort((a, b) => b.score - a.score)[0];
      this.status(`Found ${r.total.toLocaleString()} words. Top score: ${top.word.toUpperCase()} for ${top.score} points.`, 'ok');
    }
    $('f-results').replaceChildren(...r.groups.map((g) => {
      const sec = document.createElement('section');
      sec.className = 'len-group';
      const h = document.createElement('h3');
      h.textContent = `${g.length} letters `;
      h.append(Object.assign(document.createElement('span'), { className: 'muted', textContent: `(${g.words.length.toLocaleString()})` }));
      const list = document.createElement('div');
      list.className = 'chips';
      for (const f of g.words) {
        const c = document.createElement('span');
        c.className = 'chip word';
        const w = document.createElement('b');
        w.className = 'mono';
        [...f.word].forEach((ch, i) => {
          if (f.wild >> i & 1) w.append(Object.assign(document.createElement('u'), { textContent: ch.toUpperCase(), title: 'from a blank' }));
          else w.append(ch.toUpperCase());
        });
        c.append(w, ' ', Object.assign(document.createElement('small'), { textContent: String(f.score) }));
        list.append(c);
      }
      sec.append(h, list);
      return sec;
    }));
  }

  demo(id: TourDemo) {
    const set = (s: Partial<Snap>) => this.restore({ tiles: '', starts: '', ends: '', contains: '', length: '0', ...s });
    if (id === 'f-tiles' || id === 'f-results') set({ tiles: 'retains?' });
    if (id === 'f-filters') set({ tiles: 'clay', ends: 'ing' });
  }

  onKey(e: KeyboardEvent): boolean {
    if (e.key === '/') { $('f-tiles').focus(); return true; }
    return false;
  }
}
