/**
 * Tutorial content: short lessons (an idea in plain words, some tiles to look
 * at, one question), the app-tour steps with their live examples, and saved
 * progress. Lesson answers are checked against the app's own engine in
 * lessons.test.ts.
 */

export const GAME_TABS = ['guess', 'finder'] as const;
export type GameTab = (typeof GAME_TABS)[number];

export interface Lesson {
  id: string;
  tab: GameTab;
  title: string;
  body: string[];
  /** Tiles to show: words with their colours, like "crane:00120 | slate". Digits: 0 gray, 1 yellow, 2 green. */
  show?: string;
  ask: string;
  choices: string[];
  answer: number;
  explain: string;
  hint: string;
}

export const LESSONS: Lesson[] = [
  { id: 'colours', tab: 'guess', title: 'What the colours mean',
    body: ['In a five-letter guessing game you type a word and each letter turns a colour.',
      'Green: right letter, right spot. Yellow: the letter is in the word, but somewhere else. Gray: the letter is not in the word.'],
    show: 'crane:02001',
    ask: 'You guessed CRANE and got gray, green, gray, gray, yellow. What do you know?',
    choices: ['The word starts with R', 'R is second, and E is in the word but not last', 'The word has no E'], answer: 1,
    explain: 'R is green, so it sits in spot 2. E is yellow, so it is in the word, just not in spot 5.',
    hint: 'Green means the exact spot. Yellow means somewhere else.' },
  { id: 'doubles', tab: 'guess', title: 'Double letters',
    body: ['If you guess a word with two of the same letter but the answer has only one, only one of them lights up. The other one goes gray.',
      'So a gray letter doesn\'t always mean "not in the word". It can mean "no more copies of it".'],
    show: 'speed:20022',
    ask: 'The answer is SHRED. You guess SPEED. What colour is the first E (spot 3)?',
    choices: ['Green', 'Yellow', 'Gray'], answer: 2,
    explain: 'SHRED has one E, and the E in spot 4 is already green and uses it up. So the E in spot 3 is gray.',
    hint: 'Greens are counted first. How many Es does SHRED have?' },
  { id: 'bits', tab: 'guess', title: 'Why some guesses tell you more',
    body: ['Imagine 8 words are left. A guess that splits them into 8 groups of 1 tells you the answer for sure. A guess that leaves them all in one group tells you nothing.',
      'The app counts this in "bits". Each bit cuts the list in half: 1 bit halves it, 2 bits leaves a quarter, 3 bits an eighth.'],
    ask: 'A guess gives you 3 bits of information. If 80 words were left, about how many are left after it?',
    choices: ['About 40', 'About 27', 'About 10', 'About 3'], answer: 2,
    explain: '3 bits halves the list three times: 80 → 40 → 20 → 10.',
    hint: 'Halve it once for each bit.' },
  { id: 'blanks', tab: 'finder', title: 'Blank tiles',
    body: ['In letter-tile games a blank tile can be any letter you like, but it scores 0 points.',
      'Type ? for a blank. The app tries every letter for it and underlines the letter the blank became.'],
    ask: 'You have the letters C, T and a blank (?). Which word can you make?',
    choices: ['CAT', 'COAST', 'TACK'], answer: 0,
    explain: 'CAT uses C, T, and the blank as an A. COAST needs 5 tiles and TACK needs 4.',
    hint: 'You only have three tiles.' },
  { id: 'board', tab: 'finder', title: 'Letters on the board',
    body: ['Often you build on a letter that is already on the board. Put it in "Starts with", "Ends with" or "Contains", and you don\'t need it in your own letters.',
      'For example, with an E on the board you could play the tiles R, A, D in front of it to spell DARE.'],
    ask: 'Your letters are T, A, C. The board has an S you can end on. Which word fits "Ends with S"?',
    choices: ['CATS', 'CASTS', 'SCAT'], answer: 0,
    explain: 'CATS: C, A, T from your letters, and the S from the board at the end.',
    hint: 'The S has to come last, and you only have one each of T, A and C.' },
];

export interface TourStep {
  id: string;
  target: string;
  title: string;
  body: string;
  touchBody?: string;
  tab?: GameTab;
  demo?: TourDemo;
}
export type TourDemo = 'g-board' | 'g-best' | 'g-left' | 'g-double' | 'f-tiles' | 'f-filters' | 'f-results';

export const TOUR: TourStep[] = [
  { id: 'tabs', target: '#tabs', title: 'Two tools', body: 'Guess Helper is for five-letter guessing games. Word Finder lists every word you can make from your letter tiles. Each keeps its own work.' },
  { id: 'board', target: '#board-card', tab: 'guess', demo: 'g-board', title: 'Type your guesses',
    body: 'Type the word you guessed and press Add. Then click each tile until it matches the colours the game showed you. Here we guessed TARES and got T green, E yellow.',
    touchBody: 'Type the word you guessed and tap Add. Then tap each tile until it matches the colours the game showed you. Here we guessed TARES and got T green, E yellow.' },
  { id: 'best', target: '#best-card', tab: 'guess', demo: 'g-best', title: 'Best next guess',
    body: 'The app tries every word as your next guess and ranks them by how much they tell you (info, in bits) and how many words you can expect to have left. Click one to play it.' },
  { id: 'left', target: '#left-card', tab: 'guess', demo: 'g-left', title: 'Words that still fit',
    body: 'Every word that matches all your colours, most likely first. The chance comes from how common each word is.' },
  { id: 'double', target: '#board-card', tab: 'guess', demo: 'g-double', title: 'Double letters done right',
    body: 'Here SPEED came back with only one E lit. The app knows that means the word has exactly one E, not zero.' },
  { id: 'only', target: '#g-only', tab: 'guess', title: 'Play to win now',
    body: 'Tick this to only suggest words that could be the answer. Sometimes a word that can\'t win tells you more, so it is off at first.' },
  { id: 'tiles', target: '#tiles-card', tab: 'finder', demo: 'f-tiles', title: 'Your letters',
    body: 'Type your tiles. Use ? for a blank. Here: R E T A I N S plus a blank.' },
  { id: 'filters', target: '#filters-card', tab: 'finder', demo: 'f-filters', title: 'Filters',
    body: 'Words that start with, end with, or contain some letters, or have an exact length. These letters are already on the board, so they don\'t use your tiles. Here: words ending in ING.' },
  { id: 'results', target: '#results-card', tab: 'finder', demo: 'f-results', title: 'Words, longest first',
    body: 'Words are grouped by length, best score first. A letter made from a blank is underlined and scores 0.' },
  { id: 'settings', target: '#settings', title: 'Settings',
    body: 'The gear opens Settings: four looks, light or dark (or follow your computer), and About with where the words come from. The 🎓 button has these lessons and this tour.' },
];

export interface Progress { v: 1; offered: boolean; lessonsDone: string[]; lesson: number; tour: number; tourDone: boolean }
export const PROGRESS_KEY = 'word-solver-tutorial';
export const freshProgress = (): Progress => ({ v: 1, offered: false, lessonsDone: [], lesson: 0, tour: 0, tourDone: false });

type KV = Pick<Storage, 'getItem' | 'setItem'>;

/** Read saved progress, tolerating missing, corrupt or out-of-range data. */
export function loadProgress(store: KV): Progress {
  const p = freshProgress();
  let raw: Partial<Progress> = {};
  try { raw = JSON.parse(store.getItem(PROGRESS_KEY) ?? '{}') ?? {}; } catch { /* corrupt: start over */ }
  if (typeof raw !== 'object') return p;
  const ids = new Set(LESSONS.map((l) => l.id));
  const clamp = (x: unknown, max: number) => (Number.isInteger(x) ? Math.max(0, Math.min(max, x as number)) : 0);
  return {
    v: 1,
    offered: raw.offered === true,
    lessonsDone: Array.isArray(raw.lessonsDone) ? raw.lessonsDone.filter((x) => ids.has(x)) : p.lessonsDone,
    lesson: clamp(raw.lesson, LESSONS.length - 1),
    tour: clamp(raw.tour, TOUR.length - 1),
    tourDone: raw.tourDone === true,
  };
}
export const saveProgress = (store: KV, p: Progress) => store.setItem(PROGRESS_KEY, JSON.stringify(p));

export function progressSummary(p: Progress): string {
  const tour = p.tourDone ? 'tour done' : p.tour > 0 ? `tour at step ${p.tour + 1}/${TOUR.length}` : 'tour not started';
  return `${p.lessonsDone.length}/${LESSONS.length} lessons · ${tour}`;
}

export const WELCOME = {
  title: 'Welcome to Word Solver',
  body: 'Two helpers for word games. Guess Helper finds the best next guess in five-letter guessing games. Word Finder lists every word you can make from your letters. The short lessons explain how it works, and the tour shows each part with live examples. Both are in the 🎓 Tutorial menu too.',
  learn: 'Learn the ideas',
  tour: 'Tour the app',
  skip: 'Not now',
};
