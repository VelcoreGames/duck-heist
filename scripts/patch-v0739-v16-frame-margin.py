from pathlib import Path

p = Path('scripts/generate-player-chibi-v16.py')
text = p.read_text()
changes = {
    "        q['jump']=max(0,sin(p*pi))*4.4; q['bob']=-q['jump']; q['wing']=4.2*sin(p*pi); q['stride']=sin(phase)\n":
    "        # Keep the celebratory hop energetic without touching the 64px frame edge.\n        q['jump']=max(0,sin(p*pi))*3.0; q['bob']=-q['jump']; q['wing']=4.2*sin(p*pi); q['stride']=sin(phase)\n",
    "    if state!='celebrate' or q['jump']<3.7:\n":
    "    if state!='celebrate' or q['jump']<2.55:\n",
}
for old, new in changes.items():
    if text.count(old) != 1:
        raise SystemExit(f'expected exactly one match for {old!r}, found {text.count(old)}')
    text = text.replace(old, new, 1)
p.write_text(text)
print('tightened V16 celebration hop to preserve full-frame alpha margin')
