# Generador de sprites kawaii del pato (pixel art por capas con sombreado hue-shift y contorno selectivo).
import math, json
from PIL import Image
W=H=30
def ell(cx,cy,rx,ry):
    return lambda x,y: ((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2<=1
def normal(cx,cy,rx,ry,x,y):
    nx=(x+.5-cx)/rx; ny=(y+.5-cy)/ry; return nx,ny
LIGHT=(-.62,-.78)
def hexrgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
class Sprite:
    def __init__(s): s.px=[[None]*W for _ in range(H)]; s.part=[[None]*W for _ in range(H)]
    def shape(s,cx,cy,rx,ry,ramp,part,shade_bias=0.0,occl=None):
        # ramp: [hi, base, sh1, sh2]
        f=ell(cx,cy,rx,ry)
        for y in range(H):
            for x in range(W):
                if f(x,y):
                    nx,ny=normal(cx,cy,rx,ry,x,y)
                    d=(nx*LIGHT[0]+ny*LIGHT[1])+shade_bias  # >0 iluminado
                    r=math.hypot(nx,ny)
                    # Sombreado suave: mucho tono base, brillo en media luna y sombras con hue-shift.
                    if d>.42 and .38<r<.9: c=ramp[0]
                    elif d>-.30: c=ramp[1]
                    elif d<-.68 and r>.78: c=ramp[3]
                    else: c=ramp[2]
                    if occl and occl(x,y): c=ramp[2] if c in (ramp[0],ramp[1]) else ramp[3]
                    s.px[y][x]=c; s.part[y][x]=part
    def contact(s,top,bottom,color):
        # Sombra de contacto: la parte de abajo se oscurece justo debajo de la de arriba.
        for y in range(1,H):
            for x in range(W):
                if s.part[y][x]==bottom and s.part[y-1][x]==top: s.px[y][x]=color
    def put(s,x,y,c,part='detail'):
        if 0<=x<W and 0<=y<H: s.px[y][x]=c; s.part[y][x]=part
    def rows(s,x0,y0,rows,pal):
        for j,row in enumerate(rows):
            for i,ch in enumerate(row):
                if ch!='.' and ch in pal: s.put(x0+i,y0+j,pal[ch])
    def outline(s,dark,light,inner=None):
        out=[[None]*W for _ in range(H)]
        for y in range(H):
            for x in range(W):
                if s.px[y][x] is None:
                    nb=[(x+dx,y+dy) for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)) if 0<=x+dx<W and 0<=y+dy<H and s.px[y+dy][x+dx] is not None]
                    if nb:
                        # contorno selectivo: arriba-izquierda más claro
                        lit=sum((x-nx2)*LIGHT[0]+(y-ny2)*LIGHT[1] for nx2,ny2 in nb)>0.3
                        out[y][x]=light if lit else dark
        for y in range(H):
            for x in range(W):
                if out[y][x]: s.px[y][x]=out[y][x]; s.part[y][x]='outline'
    def img(s,scale=1,bg=None):
        im=Image.new('RGBA',(W,H),bg or (0,0,0,0))
        for y in range(H):
            for x in range(W):
                c=s.px[y][x]
                if c: im.putpixel((x,y),hexrgb(c)+(255,))
        return im.resize((W*scale,H*scale),Image.NEAREST) if scale!=1 else im
