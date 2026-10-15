/** Letter tiles drawn in HTML: colour tiles for guesses, cream tiles for the finder. */
export function tile(letter: string, colour?: number | null, size = ''): HTMLElement {
  const t = document.createElement('span');
  t.className = `tile${size ? ' ' + size : ''}${colour == null ? '' : ' c' + colour}`;
  t.textContent = letter.toUpperCase();
  return t;
}
/** A word as tiles; `colours` is a digit per letter (0 gray, 1 yellow, 2 green) or empty. */
export function tileRow(word: string, colours = '', size = ''): HTMLElement {
  const r = document.createElement('span');
  r.className = 'tile-row';
  r.setAttribute('role', 'img');
  const names = ['gray', 'yellow', 'green'];
  r.setAttribute('aria-label', [...word].map((c, i) => c.toUpperCase() + (colours[i] ? ' ' + names[+colours[i]] : '')).join(', '));
  [...word].forEach((c, i) => r.append(tile(c, colours[i] ? +colours[i] : null, size)));
  return r;
}
