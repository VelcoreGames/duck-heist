from pathlib import Path

p=Path('scripts/generate-player-chibi-v16.py')
s=p.read_text()

old="""    d = ImageDraw.Draw(im)\n    d.ellipse(box(x0,y0,x1,y1), outline=rgba(outline), width=max(1,S(width)))\n"""
new="""    if outline:\n        d = ImageDraw.Draw(im)\n        d.ellipse(box(x0,y0,x1,y1), outline=rgba(outline), width=max(1,S(width)))\n"""
if old not in s:
    raise SystemExit('gradient outline anchor missing')
s=s.replace(old,new,1)

old="""    # Move recoil opposite local barrel direction before rotation.\n    local=local.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)\n    cx=S(anchor[0]-recoil); cy=S(anchor[1]+lowered)\n"""
new="""    local=local.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)\n    cx=S(anchor[0]); cy=S(anchor[1]+lowered)\n"""
if old not in s:
    raise SystemExit('gun recoil anchor missing')
s=s.replace(old,new,1)

old="""def paste_gun(im, direction, anchor, recoil=0.0, lowered=0.0, alpha=255):\n    if direction=='right': angle=0\n    elif direction=='left': angle=180\n    elif direction=='up': angle=270\n    else: angle=74\n    g,pos=gun_layer(angle,anchor,recoil,lowered,alpha)\n    im.alpha_composite(g,pos)\n"""
new="""def paste_gun(im, direction, anchor, recoil=0.0, lowered=0.0, alpha=255):\n    ax,ay=anchor\n    if direction=='right':\n        angle=0; ax-=recoil\n    elif direction=='left':\n        angle=180; ax+=recoil\n    elif direction=='up':\n        angle=270; ay+=recoil\n    else:\n        angle=74; ay-=recoil*.72\n    g,pos=gun_layer(angle,(ax,ay),0,lowered,alpha)\n    im.alpha_composite(g,pos)\n"""
if old not in s:
    raise SystemExit('paste_gun anchor missing')
s=s.replace(old,new,1)

p.write_text(s)
print('v16 generator source hardened')
