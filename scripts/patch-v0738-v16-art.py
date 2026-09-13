from pathlib import Path
import re

p=Path('scripts/generate-player-chibi-v16.py')
s=p.read_text()

old="""        ang=(74 if direction!='left' else -74)*(1-(1-down)**2)\n        rot=base.rotate(ang,resample=Image.Resampling.BICUBIC,center=(S(32),S(36)),translate=(S((down-.5)*1.5),S(7*down)),fillcolor=(0,0,0,0))\n"""
new="""        turn_sign=-1 if direction=='left' else 1\n        ang=66*turn_sign*(1-(1-down)**2)\n        # Counter-shift the fall so the head/weapon never clip the 64px frame.\n        rot=base.rotate(ang,resample=Image.Resampling.BICUBIC,center=(S(32),S(36)),translate=(S(turn_sign*4.2*down),S(7*down)),fillcolor=(0,0,0,0))\n"""
if old not in s: raise SystemExit('down rotation anchor missing')
s=s.replace(old,new,1)

old="""    if direction=='up' and state not in ('celebrate',):\n        paste_gun(im,direction,(36,29+bob),recoil,q['lowered'])\n"""
new="""    if direction=='up' and state not in ('celebrate',):\n        # Offset to the shoulder so the rear weapon remains readable instead of\n        # disappearing completely behind the large chibi head.\n        paste_gun(im,direction,(47,31+bob),recoil,q['lowered'])\n"""
if old not in s: raise SystemExit('up weapon anchor missing')
s=s.replace(old,new,1)

old="""    elif direction=='up' and state!='celebrate':\n        # wing closes over the rear weapon grip\n        ellipse(im,(31,31+bob*.2,40,42+bob*.2),WING,INK,1.1)\n"""
new="""    elif direction=='up' and state!='celebrate':\n        # Wing closes over the shifted rear weapon grip.\n        ellipse(im,(39.5,33+bob*.2,49.5,44+bob*.2),WING,INK,1.1)\n"""
if old not in s: raise SystemExit('up grip wing anchor missing')
s=s.replace(old,new,1)

p.write_text(s)

index=Path('index.html')
h=index.read_text()
h2,n=re.subn(r'<meta name="duck-heist-build" content="[^"]+" />','<meta name="duck-heist-build" content="0.7.38-chibi-v16-polish" />',h,count=1)
if n!=1: raise SystemExit('build marker missing')
index.write_text(h2)
