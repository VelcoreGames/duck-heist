from __future__ import annotations

from pathlib import Path
from math import sin, cos, pi
from PIL import Image, ImageDraw, ImageFilter

OUT = Path('src/assets/chibi/base-duck-chibi-v16-atlas.png')
F = 64
SS = 3
W = H = F * SS
DIRS = ('down', 'up', 'left', 'right')
COUNTS = {
    'idle': 12,
    'walk': 20,
    'shoot': 12,
    'dash': 16,
    'hurt': 8,
    'down': 20,
    'interact': 12,
    'celebrate': 16,
}
START = {}
_cursor = 0
for _name, _count in COUNTS.items():
    START[_name] = _cursor
    _cursor += _count
COLS = _cursor  # 116

# Warm bank-heist chibi palette.
INK = '#39281f'
INK_SOFT = '#5a3c28'
FEATHER_TOP = '#fff0ad'
FEATHER = '#f4d276'
FEATHER_SHADOW = '#d7a94b'
BODY_TOP = '#f1cf72'
BODY_BOTTOM = '#c9953e'
BELLY = '#fff0c7'
WING = '#dfb354'
BEAK = '#ef8e2c'
BEAK_HI = '#ffb54a'
FEET = '#e77d26'
EYE = '#241a18'
GUN_DARK = '#182027'
GUN_MID = '#4f5e66'
GUN_HI = '#b9c4c2'
BRASS = '#d7a84e'
WOOD = '#9b5d2d'


def S(v: float) -> int:
    return int(round(v * SS))


def box(x0, y0, x1, y1):
    return (S(x0), S(y0), S(x1), S(y1))


def rgba(hexv: str, a: int = 255):
    h = hexv.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) + (a,)


def gradient_ellipse(im: Image.Image, b, top: str, bottom: str, outline: str = INK, width: float = 1.6):
    x0,y0,x1,y1 = b
    mask = Image.new('L', im.size, 0)
    md = ImageDraw.Draw(mask)
    md.ellipse(box(x0,y0,x1,y1), fill=255)
    grad = Image.new('RGBA', im.size, (0,0,0,0))
    gp = grad.load()
    tr,tg,tb,_ = rgba(top)
    br,bg,bb,_ = rgba(bottom)
    ya,yb = S(y0), max(S(y0)+1,S(y1))
    xa,xb = max(0,S(x0)), min(W,S(x1)+1)
    for yy in range(max(0,ya), min(H,yb+1)):
        t = max(0,min(1,(yy-ya)/max(1,yb-ya)))
        c = (int(tr+(br-tr)*t),int(tg+(bg-tg)*t),int(tb+(bb-tb)*t),255)
        for xx in range(xa,xb): gp[xx,yy]=c
    im.alpha_composite(Image.composite(grad, Image.new('RGBA', im.size), mask))
    if outline:
        d = ImageDraw.Draw(im)
        d.ellipse(box(x0,y0,x1,y1), outline=rgba(outline), width=max(1,S(width)))


def ellipse(im, b, fill, outline=None, width=1.4):
    d=ImageDraw.Draw(im)
    d.ellipse(box(*b), fill=rgba(fill) if isinstance(fill,str) else fill,
              outline=rgba(outline) if outline else None, width=max(1,S(width)))


def polygon(im, pts, fill, outline=None, width=1.3):
    d=ImageDraw.Draw(im)
    p=[(S(x),S(y)) for x,y in pts]
    d.polygon(p, fill=rgba(fill) if isinstance(fill,str) else fill)
    if outline: d.line(p+[p[0]], fill=rgba(outline), width=max(1,S(width)), joint='curve')


def line(im, pts, fill, width=1.0):
    ImageDraw.Draw(im).line([(S(x),S(y)) for x,y in pts], fill=rgba(fill), width=max(1,S(width)), joint='curve')


def translucent_ellipse(im, b, color, alpha):
    lay=Image.new('RGBA',im.size,(0,0,0,0)); d=ImageDraw.Draw(lay)
    d.ellipse(box(*b), fill=rgba(color,alpha)); im.alpha_composite(lay)


def gun_layer(angle: float, anchor: tuple[float,float], recoil: float=0.0, lowered: float=0.0, alpha: int=255):
    # Compact hero blaster: readable metal planes, a short stock and a tucked grip.
    # It stays visually attached to the wing instead of reading like a floating prop.
    local=Image.new('RGBA',(S(34),S(18)),(0,0,0,0)); d=ImageDraw.Draw(local)
    d.rounded_rectangle(box(3,5,28.5,12), radius=S(2.0), fill=rgba(GUN_DARK,alpha), outline=rgba(INK,alpha), width=S(1.1))
    d.rounded_rectangle(box(6.2,6.0,24.2,9.55), radius=S(.9), fill=rgba(GUN_MID,alpha))
    d.rounded_rectangle(box(8.2,6.18,20.6,7.1), radius=S(.32), fill=rgba(GUN_HI,int(alpha*.92)))
    d.rounded_rectangle(box(26.3,6.05,33.0,9.9), radius=S(.72), fill=rgba('#697980',alpha))
    d.rectangle(box(29.0,6.52,33.0,7.22), fill=rgba('#e4ece8',int(alpha*.78)))
    d.rounded_rectangle(box(3.6,7.1,7.3,10.6), radius=S(.62), fill=rgba(BRASS,alpha))
    d.polygon([(S(14.7),S(10)),(S(20.0),S(10)),(S(18.1),S(17)),(S(14.0),S(17))], fill=rgba(INK,alpha))
    d.rounded_rectangle(box(15.0,10.9,18.1,16.1), radius=S(.55), fill=rgba(WOOD,alpha))
    d.rounded_rectangle(box(4.3,10.6,11.2,12.6), radius=S(.55), fill=rgba('#6f452a',alpha))
    local=local.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    cx=S(anchor[0]); cy=S(anchor[1]+lowered)
    return local,(int(cx-local.width/2),int(cy-local.height/2))


def paste_gun(im, direction, anchor, recoil=0.0, lowered=0.0, alpha=255):
    ax,ay=anchor
    if direction=='right':
        angle=0; ax-=recoil
    elif direction=='left':
        angle=180; ax+=recoil
    elif direction=='up':
        angle=270; ay+=recoil
    else:
        angle=74; ay-=recoil*.72
    g,pos=gun_layer(angle,(ax,ay),0,lowered,alpha)
    im.alpha_composite(g,pos)


def pose(state: str, i: int, n: int):
    p = i / max(1,n)
    phase = p * 2*pi
    q = {
        'bob':0.0,'lean':0.0,'stride':0.0,'wing':0.0,'blink':False,
        'recoil':0.0,'squash':0.0,'stretch':0.0,'hurt':0.0,
        'down':0.0,'reach':0.0,'jump':0.0,'lowered':0.0,
        'sway':0.0,'plant':0.0,
    }
    if state=='idle':
        q['bob']=-.55*sin(phase); q['wing']=.25*sin(phase); q['blink']=i in (8,9)
    elif state=='walk':
        # Premium gait: clear planted steps, less pogo bounce and a small lateral
        # weight transfer that makes vertical walking read instead of slide.
        q['stride']=sin(phase)
        q['bob']=-1.35*abs(sin(phase))
        q['lean']=.82*sin(phase)
        q['wing']=1.55*sin(phase+pi)
        q['sway']=1.35*cos(phase)
        q['plant']=cos(phase*2)
    elif state=='shoot':
        t=i/(n-1); attack=min(1,t/.22); recover=max(0,1-(t-.22)/.78) if t>.22 else 1
        q['recoil']=3.55*((1-(1-attack)**3) if t<=.22 else recover**1.72)
        q['bob']=-.48*q['recoil']; q['squash']=.031*q['recoil']; q['blink']=False
    elif state=='dash':
        t=i/(n-1)
        if t<.18: q['squash']=.13*(1-t/.18)
        else: q['stretch']=.12*sin(min(1,(t-.18)/.65)*pi)
        q['bob']=-1.2*sin(t*pi); q['wing']=2.4*sin(t*pi); q['stride']=.7*sin(t*pi*2)
    elif state=='hurt':
        t=i/(n-1); impact=1-t
        snap=(1 if i<2 else -1 if i<4 else .42 if i<6 else 0)
        q['hurt']=impact; q['lean']=snap*3.25*impact; q['bob']=-1.35*impact; q['squash']=.055*impact; q['blink']=True
    elif state=='down': q['down']=i/(n-1); q['blink']=True
    elif state=='interact':
        q['reach']=sin(p*pi); q['bob']=-1.0*sin(p*pi); q['lowered']=2.2*sin(p*pi); q['wing']=2.4*sin(p*pi)
    elif state=='celebrate':
        # Keep the celebratory hop energetic without touching the 64px frame edge.
        q['jump']=max(0,sin(p*pi))*3.0; q['bob']=-q['jump']; q['wing']=4.2*sin(p*pi); q['stride']=sin(phase)
    return q


def draw_face(im, direction, cx, cy, blink=False, hurt=0.0):
    d=ImageDraw.Draw(im)
    if direction=='up':
        # Smooth clean crown: the base duck has no hair, hat or eyewear.
        translucent_ellipse(im,(cx-10,cy-10,cx-3,cy-5),'#fff8cd',72)
        translucent_ellipse(im,(cx+2,cy-9,cx+9,cy-5),'#c8923d',34)
        return
    if direction=='down':
        eyes=[(cx-6.1,cy-2.4),(cx+6.1,cy-2.4)]
        for ex,ey in eyes:
            if blink or hurt>.55:
                line(im,[(ex-2,ey),(ex+2,ey+.25)],EYE,1.35)
            else:
                ellipse(im,(ex-2.15,ey-3.1,ex+2.15,ey+2.1),EYE)
                ellipse(im,(ex-.95,ey-2.05,ex+.15,ey-.85),'#ffffff')
        # expressive brows remain feather-colored/dark, not hair.
        if hurt>.2:
            line(im,[(cx-9,cy-7),(cx-4,cy-5.5)],INK_SOFT,1.05); line(im,[(cx+4,cy-5.5),(cx+9,cy-7)],INK_SOFT,1.05)
        ellipse(im,(cx-7.2,cy+3.0,cx+7.2,cy+8.2),BEAK,INK,1.25)
        translucent_ellipse(im,(cx-5.2,cy+3.7,cx+4.6,cy+5.0),BEAK_HI,170)
        line(im,[(cx-5.4,cy+6.3),(cx+5.4,cy+6.3)],'#a65325',.65)
    else:
        sign=-1 if direction=='left' else 1
        ex=cx+sign*6.0; ey=cy-2.5
        if blink or hurt>.55: line(im,[(ex-2,ey),(ex+2,ey)],EYE,1.35)
        else:
            ellipse(im,(ex-2.2,ey-3.1,ex+2.2,ey+2.0),EYE)
            ellipse(im,(ex-sign*.5,ey-2.0,ex+sign*.5+1.0,ey-.9),'#ffffff')
        bx=cx+sign*16.2
        if sign<0: b=(bx-5.5,cy+2.0,bx+4.0,cy+7.0)
        else: b=(bx-4.0,cy+2.0,bx+5.5,cy+7.0)
        ellipse(im,b,BEAK,INK,1.2)
        translucent_ellipse(im,(b[0]+1,b[1]+.7,b[2]-1,b[1]+2),BEAK_HI,150)


def draw_duck(direction: str, state: str, i: int, n: int) -> Image.Image:
    q=pose(state,i,n)
    im=Image.new('RGBA',(W,H),(0,0,0,0))
    bob=q['bob']
    sign=-1 if direction=='left' else 1
    side=direction in ('left','right')
    # Whole chibi dimensions: ~55-60% head, compact body, small feet.
    # Front/back movement gets its own lateral weight transfer so vertical walk
    # frames have a readable planted gait at gameplay scale.
    vertical_sway=q['sway'] if (not side and state=='walk') else 0
    head_cx=32 + (2.4*sign if side else vertical_sway*.46)
    head_cy=22+bob
    body_cx=32 + (.65*sign*q['lean']/4 if side else vertical_sway*.82)
    body_cy=42.2+bob*.35
    rx=18.4*(1+q['squash']*.12-q['stretch']*.05)
    ry=17.0*(1-q['squash']*.10+q['stretch']*.03)
    body_rx=11.0*(1+q['squash']*.45+q['stretch']*.18)
    body_ry=12.6*(1-q['squash']*.40+q['stretch']*.18)
    # Directional recoil shifts the body opposite barrel.
    if state=='shoot':
        r=q['recoil']
        if direction=='right': head_cx-=r; body_cx-=r
        elif direction=='left': head_cx+=r; body_cx+=r
        elif direction=='up': head_cy+=r*.75; body_cy+=r*.75
        else: head_cy-=r*.58; body_cy-=r*.58

    # Down state is authored as a real fall: rotate the complete bird, gun drops separately.
    down=q['down']
    if down>0:
        base=draw_duck(direction,'idle',8,COUNTS['idle'])
        turn_sign=-1 if direction=='left' else 1
        ang=64*turn_sign*(1-(1-down)**2)
        # Counter-shift the fall so the head/weapon never clip the 64px frame.
        rot=base.rotate(ang,resample=Image.Resampling.BICUBIC,center=(S(32),S(36)),translate=(S(turn_sign*3.6*down),S(7.2*down)),fillcolor=(0,0,0,0))
        fade=max(.72,1-down*.15)
        if fade<1: rot.putalpha(rot.getchannel('A').point(lambda a:int(a*fade)))
        # Closed eye/impact star remains part of the authored death sequence.
        if down>.6:
            translucent_ellipse(rot,(23,50,43,58),'#4a2d20',28)
        return rot

    # Feet first. Walking gets clearly alternating feet rather than sliding.
    stride=q['stride']
    fy=56+bob*.15
    if state=='dash': fy-=1.2
    if side:
        lfx=27+stride*3.35; rfx=37-stride*3.35; lfy=fy; rfy=fy
        lfs=rfs=1.0
    else:
        lfx=27.5+q['sway']*.19; rfx=36.5+q['sway']*.19
        lfy=fy+stride*3.05; rfy=fy-stride*3.05
        depth=.13*stride
        if direction=='down': lfs,rfs=1+depth,1-depth
        else: lfs,rfs=1-depth,1+depth
    if state!='celebrate' or q['jump']<2.55:
        ellipse(im,(lfx-4.1*lfs,lfy-1.6*lfs,lfx+3.7*lfs,lfy+2.4*lfs),FEET,INK,1.05)
        ellipse(im,(rfx-3.7*rfs,rfy-1.6*rfs,rfx+4.1*rfs,rfy+2.4*rfs),FEET,INK,1.05)
        translucent_ellipse(im,(lfx-2.8*lfs,lfy-1.0*lfs,lfx+1.7*lfs,lfy-.15*lfs),BEAK_HI,120)
        translucent_ellipse(im,(rfx-1.7*rfs,rfy-1.0*rfs,rfx+2.8*rfs,rfy-.15*rfs),BEAK_HI,120)

    # Weapon behind the body only when aiming upward.
    recoil=q['recoil']*.55
    if direction=='up' and state not in ('celebrate',):
        # Offset to the shoulder so the rear weapon remains readable instead of
        # disappearing completely behind the large chibi head.
        paste_gun(im,direction,(47.4,32.2+bob),recoil,q['lowered'])

    # Tail/back wing hint.
    if side:
        tx=body_cx-sign*9
        ellipse(im,(tx-4.3,body_cy-5.4,tx+4.3,body_cy+4.2),WING,INK,1.15)

    gradient_ellipse(im,(body_cx-body_rx,body_cy-body_ry,body_cx+body_rx,body_cy+body_ry),BODY_TOP,BODY_BOTTOM,INK,1.7)
    if direction=='down':
        gradient_ellipse(im,(body_cx-6.4,body_cy-6.1,body_cx+6.4,body_cy+8.8),BELLY,'#efd495',None,0)
    elif side:
        bx=body_cx-sign*1.5
        translucent_ellipse(im,(bx-5.0,body_cy-5,bx+5,body_cy+7),BELLY,115)

    # Side wings / action wings. Their shape changes every cycle.
    wing=q['wing']
    if direction=='down':
        ellipse(im,(body_cx-14.5,body_cy-8+wing*.35,body_cx-6.2,body_cy+5.5+wing),WING,INK,1.3)
        ellipse(im,(body_cx+6.2,body_cy-8-wing*.35,body_cx+14.5,body_cy+5.5-wing),WING,INK,1.3)
    elif direction=='up':
        ellipse(im,(body_cx-13,body_cy-6-wing*.2,body_cx-6,body_cy+6+wing),WING,INK,1.25)
        ellipse(im,(body_cx+6,body_cy-6+wing*.2,body_cx+13,body_cy+6-wing),WING,INK,1.25)
    else:
        front=body_cx+sign*6.5
        ellipse(im,(front-5,body_cy-7+wing*.25,front+5,body_cy+6+wing),WING,INK,1.25)

    # Head is deliberately dominant and overlaps the body.
    gradient_ellipse(im,(head_cx-rx,head_cy-ry,head_cx+rx,head_cy+ry),FEATHER_TOP,FEATHER_SHADOW,INK,1.85)
    translucent_ellipse(im,(head_cx-rx*.62,head_cy-ry*.72,head_cx-rx*.03,head_cy-ry*.18),'#fff9d2',105)
    # Keep the base silhouette smooth: no hair tuft, hat or glasses.
    draw_face(im,direction,head_cx,head_cy,q['blink'],q['hurt'])

    # Foreground weapon and gripping wing. It is integrated into every pose.
    if direction!='up' and state!='celebrate':
        if direction=='right': anchor=(45.2,38+bob*.25)
        elif direction=='left': anchor=(18.8,38+bob*.25)
        else: anchor=(39.5,38.2+bob*.25)
        paste_gun(im,direction,anchor,recoil,q['lowered'])
        gx=anchor[0]-(4 if direction=='right' else -4 if direction=='left' else 2)
        gy=anchor[1]+(1 if direction=='down' else 0)
        ellipse(im,(gx-3.6,gy-3.0,gx+3.6,gy+3.2),WING,INK,1.1)
        translucent_ellipse(im,(gx-2.4,gy-2.2,gx+1.5,gy-1.0),'#f7db84',95)
    elif direction=='up' and state!='celebrate':
        # Wing closes over the shifted rear weapon grip.
        ellipse(im,(40.0,33.5+bob*.2,50.0,44.5+bob*.2),WING,INK,1.1)

    if state=='hurt':
        lay=Image.new('RGBA',im.size,(255,90,70,0)); lay.putalpha(im.getchannel('A').point(lambda a:int(a*.11*q['hurt'])))
        im=Image.alpha_composite(im,lay)
    if state=='celebrate':
        # Raised wings + small warm sparkles, still clean enough for gameplay scale.
        for sx,sy in ((15,21),(50,17),(13,39),(52,36)):
            r=1.1+1.2*max(0,sin(i/n*pi))
            polygon(im,[(sx,sy-r*2),(sx+r*.7,sy-r*.5),(sx+r*2,sy),(sx+r*.7,sy+r*.5),(sx,sy+r*2),(sx-r*.7,sy+r*.5),(sx-r*2,sy),(sx-r*.7,sy-r*.5)],'#fff0a6','#b78131',.55)

    # Apply a restrained global lean around the body, then downsample to final 64px.
    if abs(q['lean'])>.05:
        im=im.rotate(q['lean'],resample=Image.Resampling.BICUBIC,center=(S(32),S(43)),fillcolor=(0,0,0,0))
    return im


def main():
    atlas=Image.new('RGBA',(COLS*F,4*F),(0,0,0,0))
    for row,direction in enumerate(DIRS):
        for state,count in COUNTS.items():
            for i in range(count):
                hi=draw_duck(direction,state,i,count)
                fr=hi.resize((F,F),Image.Resampling.LANCZOS)
                atlas.alpha_composite(fr,(START[state]*F+i*F,row*F))
    OUT.parent.mkdir(parents=True,exist_ok=True)
    atlas.save(OUT,optimize=True)
    check=Image.open(OUT).convert('RGBA'); check.load()
    assert check.size==(COLS*F,4*F),check.size
    nonempty=0
    for row in range(4):
        for col in range(COLS):
            fr=check.crop((col*F,row*F,(col+1)*F,(row+1)*F))
            a=fr.getchannel('A')
            if a.getbbox(): nonempty+=1
            meaningful=sum(1 for v in a.getdata() if v>64)
            assert 90<meaningful<F*F*.72,(row,col,meaningful)
    assert nonempty==COLS*4,(nonempty,COLS*4)
    print(f'generated {COLS*4} chibi raster frames -> {OUT} {check.size}')
    print('starts',START,'counts',COUNTS)

if __name__=='__main__':
    main()
