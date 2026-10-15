// Works out the best first guesses over every five-letter word (slow, so done
// once here instead of in the app). Run: npx tsx tools/gen-openers.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { answerWeight, bestGuesses } from '../src/words/clues';

const rows = readFileSync('public/data/words5.txt', 'utf-8').trim().split('\n').map((l) => l.split(' '));
const words = rows.map((r) => r[0]), weights = rows.map((r) => answerWeight(Number(r[1])));
const best = bestGuesses(words, weights, words, 10, Infinity);
const round = (x: number, d: number) => Number(x.toFixed(d));
writeFileSync('src/words/openers.ts', `// Made by tools/gen-openers.ts from public/data/words5.txt: the best first guesses.\nimport type { GuessScore } from './clues';\n\nexport const OPENERS: GuessScore[] = ${JSON.stringify(best.map((b) => ({ word: b.word, bits: round(b.bits, 3), chance: round(b.chance, 5), left: round(b.left, 1) })), null, 2)};\n`);
console.log(best.map((b) => `${b.word} ${b.bits.toFixed(2)}`).join('\n'));
