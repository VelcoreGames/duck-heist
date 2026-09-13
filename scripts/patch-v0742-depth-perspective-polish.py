from pathlib import Path

GEN=Path('scripts/generate-player-chibi-v16.py')
RUNTIME=Path('src/game/graphics/playerChibiAtlasV16.ts')

text=GEN.read_text()
start=text.index('def front_gun_layer')
end=text.index('def pose(', start)
replacement='''def front_gun_layer(anchor: tuple[float,float], recoil: float=0.0, lowered: float=0.0, alpha: int=255):
    # Compact down-screen projection of the same hero blaster. Receiver, wood
    # grip and muzzle remain distinct at 64px without reading as a flashlight.
    local=Image.new('RGBA',(S(20),S(23)),(0,0,0,0)); d=ImageDraw.Draw(local)
    d.rounded_rectangle(box(6.1,3.0,14.5,14.8), radius=S(1.35), fill=rgba(GUN_DARK,alpha), outline=rgba(INK,alpha), width=S(1.0))
    d.rounded_rectangle(box(7.1,4.0,13.4,13.2), radius=S(.78), fill=rgba(GUN_MID,alpha))
    d.rounded_rectangle(box(8.0,4.5,10.0,11.7), radius=S(.35), fill=rgba(GUN_HI,int(alpha*.92)))
    d.rectangle(box(14.0,7.1,17.5,9.2), fill=rgba(BRASS,alpha))
    d.rounded_rectangle(box(7.0,12.6,13.9,18.4), radius=S(.95), fill=rgba('#435159',alpha), outline=rgba(INK,alpha), width=S(.82))
    d.ellipse(box(6.4,17.0,14.6,22.0), fill=rgba('#182127',alpha), outline=rgba(INK,alpha), width=S(.85))
    d.ellipse(box(7.7,18.0,13.3,21.0), fill=rgba('#71848b',alpha))
    d.ellipse(box(8.6,18.5,12.4,20.4), fill=rgba('#dbe5e1',int(alpha*.70)))
    d.polygon([(S(6.8),S(9.0)),(S(2.9),S(11.0)),(S(4.0),S(17.3)),(S(7.6),S(14.8))], fill=rgba(WOOD,alpha))
    d.line([(S(4.0),S(11.7)),(S(6.5),S(10.5))], fill=rgba(BRASS,alpha), width=S(.72))
    local=local.rotate(-5.5,resample=Image.Resampling.BICUBIC,expand=True)
    cx=S(anchor[0]); cy=S(anchor[1]+lowered-recoil*.58)
    return local,(int(cx-local.width/2),int(cy-local.height/2))


def paste_front_gun(im, anchor, recoil=0.0, lowered=0.0, alpha=255):
    g,pos=front_gun_layer(anchor,recoil,lowered,alpha); im.alpha_composite(g,pos)


def rear_gun_layer(anchor: tuple[float,float], recoil: float=0.0, lowered: float=0.0, alpha: int=255):
    # Rear/up projection exposes a small muzzle, barrel, receiver and tucked
    # stock. The uneven outline reads as a weapon rather than a vertical tube.
    local=Image.new('RGBA',(S(21),S(26)),(0,0,0,0)); d=ImageDraw.Draw(local)
    d.ellipse(box(6.4,.6,13.8,4.6), fill=rgba('#182127',alpha), outline=rgba(INK,alpha), width=S(.82))
    d.ellipse(box(7.5,1.3,12.7,3.7), fill=rgba('#71848b',alpha))
    d.rounded_rectangle(box(7.0,3.3,13.4,14.2), radius=S(1.05), fill=rgba(GUN_DARK,alpha), outline=rgba(INK,alpha), width=S(.92))
    d.rounded_rectangle(box(7.9,4.0,12.5,12.8), radius=S(.62), fill=rgba(GUN_MID,alpha))
    d.rounded_rectangle(box(8.5,4.4,10.0,11.4), radius=S(.28), fill=rgba(GUN_HI,int(alpha*.90)))
    d.rounded_rectangle(box(5.4,12.5,14.6,18.9), radius=S(.9), fill=rgba('#3f4d55',alpha), outline=rgba(INK,alpha), width=S(.8))
    d.rectangle(box(13.7,13.5,18.8,15.5), fill=rgba(BRASS,alpha))
    d.polygon([(S(7.0),S(16.1)),(S(3.0),S(18.5)),(S(4.4),S(25.0)),(S(8.4),S(21.7))], fill=rgba(WOOD,alpha))
    d.rounded_rectangle(box(10.5,17.4,15.8,20.0), radius=S(.55), fill=rgba('#6f452a',alpha))
    local=local.rotate(5.0,resample=Image.Resampling.BICUBIC,expand=True)
    cx=S(anchor[0]); cy=S(anchor[1]+lowered+recoil*.74)
    return local,(int(cx-local.width/2),int(cy-local.height/2))


def paste_rear_gun(im, anchor, recoil=0.0, lowered=0.0, alpha=255):
    g,pos=rear_gun_layer(anchor,recoil,lowered,alpha); im.alpha_composite(g,pos)


'''
text=text[:start]+replacement+text[end:]
text=text.replace("anchor=(47.0,41.5+bob*.18)","anchor=(46.4,41.2+bob*.18)",1)
text=text.replace("ellipse(im,(39.3,37.6+bob*.16,47.6,46.8+bob*.16),WING,INK,1.1)","ellipse(im,(39.0,37.5+bob*.16,47.2,46.6+bob*.16),WING,INK,1.1)",1)
text=text.replace("translucent_ellipse(im,(40.5,38.7+bob*.16,44.7,40.1+bob*.16),'#f7db84',95)","translucent_ellipse(im,(40.1,38.6+bob*.16,44.3,40.0+bob*.16),'#f7db84',95)",1)
text=text.replace("anchor=(50.2,31.7+bob)","anchor=(49.8,31.5+bob)",1)
GEN.write_text(text)

runtime=RUNTIME.read_text()
if runtime.count("feetX + 9.1") != 1 or runtime.count("feetX + 12.0") != 1:
    raise SystemExit('unexpected muzzle-point precondition')
runtime=runtime.replace("feetX + 9.1, y: feetY - .2","feetX + 8.7, y: feetY - .5",1)
runtime=runtime.replace("feetX + 12.0, y: feetY - 28.0","feetX + 11.7, y: feetY - 27.8",1)
RUNTIME.write_text(runtime)

print('polished V16.4 depth weapon silhouette and muzzle alignment')
