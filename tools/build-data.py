"""Builds the word lists in public/data/ (run: python3 tools/build-data.py).

- enable.txt: the ENABLE word list (public domain), one lowercase word per line.
  Source: https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt
- words5.txt: every 5-letter ENABLE word with its Zipf frequency from the
  wordfreq project (data CC BY-SA 4.0, https://github.com/rspeer/wordfreq),
  used to weight how likely each word is to be a puzzle answer.

Needs: pip install wordfreq
"""
import urllib.request, wordfreq, pathlib
URL = 'https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt'
out = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'data'
out.mkdir(parents=True, exist_ok=True)
words = sorted({w.strip().lower() for w in urllib.request.urlopen(URL).read().decode().split() if w.strip().isalpha()})
(out / 'enable.txt').write_text('\n'.join(words) + '\n')
five = [w for w in words if len(w) == 5]
(out / 'words5.txt').write_text(''.join(f'{w} {wordfreq.zipf_frequency(w, "en"):.2f}\n' for w in five))
print(len(words), 'words,', len(five), 'five-letter')
