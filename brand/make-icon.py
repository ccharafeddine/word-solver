"""Makes the maskable icon from the Word Solver mark (brand/icon.svg, the
puzzle-suite logo) and copies the mark to public/icon.svg.
Run: python3 brand/make-icon.py"""
import re, shutil
s = open('brand/icon.svg').read()
m = re.sub(r'rx="112"', 'rx="0"', s)
m = re.sub(r'<rect x="6" y="6"[^>]*/>\n?', '', m)
# Keep the art inside the maskable safe zone (the middle 80%).
body_start = m.index('<g transform=')
m = m[:body_start] + '<g transform="translate(256 256) scale(0.8) translate(-256 -256)">\n' + m[body_start:].replace('</svg>', '</g>\n</svg>')
open('brand/icon-maskable.svg', 'w').write(m)
shutil.copy('brand/icon.svg', 'public/icon.svg')
