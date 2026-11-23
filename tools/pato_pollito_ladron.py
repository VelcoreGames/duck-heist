# Pato "Pollito ladrón" (diseño A): genera todas las poses y exporta a TypeScript.
from pato_gen import Sprite, W, H
from PIL import Image
import json

PAL={ # slot -> color por defecto
 'Y0':'#fff3a8','Y1':'#ffd84d','Y2':'#f6a93b','Y3':'#e07a36',
 'W0':'#ffe27a','W1':'#f9c444','W2':'#ee9a38','W3':'#d9752f',
 'OD':'#5b2e2a','OL':'#b8622f',
 'B0':'#ff8a3d','B1':'#ffc27a','B2':'#e0602c',
 'F0':'#ff9a3d','F1':'#d9702f',
 'R0':'#ff8c97','R1':'#e8455a','R2':'#b42f4d','R3':'#8a2340',
 'P':'#ff9eb2',
}
Y=[PAL['Y0'],PAL['Y1'],PAL['Y2'],PAL['Y3']]; WG=[PAL['W0'],PAL['W1'],PAL['W2'],PAL['W3']]
R={'h':PAL['R0'],'R':PAL['R1'],'r':PAL['R2'],'d':PAL['R3']}
BEAK={'b':PAL['B0'],'h':PAL['B1'],'B':PAL['B2']}
TUFT={'o':PAL['OL'],'y':PAL['W0']}
BL={'p':PAL['P']}

def feet(s,pts):
    for (x,y) in pts: s.shape(x,y,2.3,1.3,[PAL['F0'],PAL['F0'],PAL['F1'],PAL['F1']],'feet')

def gait(step):
    # (levantar pie izq, levantar pie der, rebote del cuerpo, aleteo izq, aleteo der)
    if step is None: return 0,0,0,0,0
    return [(-1,0,0,-1,0),(0,0,-1,0,0),(0,-1,0,0,-1),(0,0,-1,0,0)][step]

def build(view,step):
    s=Sprite(); lL,lR,b,wl,wr=gait(step); eyes=[]
    if view=='down':
        feet(s,[(11.6,26.4+lL),(18.4,26.4+lR)])
        s.shape(15,21+b,6.7,5.4,Y,'body')
        s.shape(8.7,21.2+b+wl,1.9,2.8,WG,'wing',-.2); s.shape(21.3,21.2+b+wr,1.9,2.8,WG,'wing',-.2)
        s.shape(15,12.3+b,9.7,8.7,Y,'head')
        s.rows(13,1+b,['.oo','oyo','.oy'],TUFT)
        s.contact('head','body',Y[2])
        s.rows(9,19+b,['.hRRRRRRRRRr.','rRRRRRRRRRRRr'],R)
        s.rows(11,21+b,['RRRRRRRrr','.RRRRRrr.','..RRRrr..','...Rr....'],R); s.rows(12,21+b,['h'],R)
        s.outline(PAL['OD'],PAL['OL'])
        s.rows(13,15+b,['.bb.','bhbb','.BB.'],BEAK)
        s.rows(7,16+b,['pp'],BL); s.rows(21,16+b,['pp'],BL)
        eyes=[(10,13+b,'L'),(18,13+b,'R')]
    elif view=='down-right':
        feet(s,[(12.6,26.4+lL),(19.2,26.4+lR)])
        s.shape(21.6,21.4+b+wr,1.8,2.6,WG,'wing',-.45)
        s.shape(15.6,21+b,6.6,5.4,Y,'body')
        s.shape(9.2,21.3+b+wl,1.9,2.8,WG,'wing',-.15)
        s.shape(16,12.4+b,9.5,8.6,Y,'head')
        s.rows(14,1+b,['.oo','oyo','.oy'],TUFT)
        s.contact('head','body',Y[2])
        s.rows(10,19+b,['.hRRRRRRRRRr.','rRRRRRRRRRRRr'],R)
        s.rows(13,21+b,['RRRRRRrr','.RRRRrr.','..RRrr..','...R....'],R); s.rows(14,21+b,['h'],R)
        s.outline(PAL['OD'],PAL['OL'])
        s.rows(16,15+b,['.bb.','bhbbb','.BBB.'],BEAK)
        s.rows(9,16+b,['p'],BL); s.rows(22,16+b,['pp'],BL)
        eyes=[(12,13+b,'L'),(20,13+b,'R')]
    elif view=='right':
        feet(s,[(13.2,26.4+lL),(17.2,26.6+lR)])
        s.shape(8.4,20.2+b,2.4,1.9,WG,'tail',-.1)
        s.shape(14,21+b,6.4,5.4,Y,'body')
        s.shape(12.4,21.4+b+wl,3.2,2.5,WG,'wing',-.35)
        s.shape(16,12.5+b,8.9,8.5,Y,'head')
        s.rows(14,1+b,['.oo','oyo','.oy'],TUFT)
        s.contact('head','body',Y[2])
        s.rows(24,14+b,['bbh','BB.'],BEAK)
        s.rows(9,19+b,['..hRRRRRRRRR','rrrrrrrrrrrr'],R); s.rows(5,19+b,['RRR','.Rr'],R)
        s.rows(17,21+b,['RRRr','.Rr.'],R)
        s.outline(PAL['OD'],PAL['OL'])
        s.rows(17,16+b,['pp'],BL)
        eyes=[(19,13+b,'R')]
    elif view=='up-right':
        feet(s,[(12.4,26.4+lL),(18.6,26.4+lR)])
        s.shape(14.6,21+b,6.6,5.4,Y,'body')
        s.shape(8.6,21.3+b+wl,1.9,2.8,WG,'wing',-.3); s.shape(20.8,21.2+b+wr,1.9,2.8,WG,'wing',-.1)
        s.shape(13.6,24.2+b,2.2,1.6,WG,'tail',-.2)
        s.shape(14.6,12.4+b,9.6,8.6,Y,'head')
        s.rows(13,1+b,['.oo','oyo','.oy'],TUFT)
        s.contact('head','body',Y[2])
        s.rows(24,14+b,['bh','B.'],BEAK)
        s.rows(8,19+b,['.rrrrrrrrrrr.'],R); s.rows(9,20+b,['RRRRRRRRRR'],R)
        s.rows(10,19+b,['.RRR.','RRrRR','.R.r.','R...r'],R)
        s.outline(PAL['OD'],PAL['OL'])
        eyes=[]
    elif view=='up':
        feet(s,[(11.6,26.4+lL),(18.4,26.4+lR)])
        s.shape(15,21+b,6.7,5.4,Y,'body')
        s.shape(8.7,21.2+b+wl,1.9,2.8,WG,'wing',-.2); s.shape(21.3,21.2+b+wr,1.9,2.8,WG,'wing',-.2)
        s.shape(15,24.2+b,2.2,1.6,WG,'tail',-.2)
        s.shape(15,12.3+b,9.7,8.7,Y,'head')
        s.rows(13,1+b,['.oo','oyo','.oy'],TUFT)
        s.contact('head','body',Y[2])
        s.rows(9,19+b,['.rrrrrrrrrrr.'],R); s.rows(10,20+b,['RRRRRRRRRR'],R)
        s.rows(13,19+b,['.RRR.','RRrRR','.R.r.','R...r'],R)
        s.outline(PAL['OD'],PAL['OL'])
        eyes=[]
    return s,eyes

SLOT_OF={v:k for k,v in PAL.items()}
# colores que comparten valor: el mapa inverso toma el último; forzamos los importantes
SLOT_OF[PAL['OL']]='OL'; SLOT_OF[PAL['W0']]='W0'
SLOTS=list(PAL.keys())
CH='abcdefghijklmnopqrstuvwxyz'
def encode(s):
    rows=[]
    for y in range(H):
        r=''
        for x in range(W):
            c=s.px[y][x]
            r+='.' if c is None else CH[SLOTS.index(SLOT_OF[c])]
        rows.append(r)
    return rows

VIEWS=['down','down-right','right','up-right','up']
STEPS=[None,0,1,2,3]
data={}; eyes={}
for v in VIEWS:
    data[v]=[]; eyes[v]=[]
    for st in STEPS:
        s,e=build(v,st); data[v].append(encode(s)); eyes[v].append(e)
# vistas izquierdas = espejo
MIR={'down-left':'down-right','left':'right','up-left':'up-right'}
for L,Rv in MIR.items():
    data[L]=[[row[::-1] for row in fr] for fr in data[Rv]]
    eyes[L]=[[(W-2-x,y,'L' if side=='R' else 'R') for (x,y,side) in fr] for fr in eyes[Rv]]

if __name__=='__main__':
    # hoja de revisión
    from PIL import ImageDraw
    order=['down','down-right','right','up-right','up','up-left','left','down-left']
    SC=6
    sheet=Image.new('RGB',(W*SC*5+60,W*SC*8+20),(170,184,194))
    def hexrgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
    for r,v in enumerate(order):
        for c in range(5):
            im=Image.new('RGBA',(W,H),(0,0,0,0))
            for y,row in enumerate(data[v][c]):
                for x,ch in enumerate(row):
                    if ch!='.': im.putpixel((x,y),hexrgb(PAL[SLOTS[CH.index(ch)]])+(255,))
            for (ex,ey,side) in eyes[v][c]:
                for (dx,dy,col) in [(0,0,'#ffffff'),(1,0,'#20172b'),(0,1,'#20172b'),(1,1,'#20172b'),(0,2,'#20172b'),(1,2,'#20172b')]:
                    im.putpixel((ex+dx,ey+dy),hexrgb(col)+(255,))
            sheet.paste(im.resize((W*SC,H*SC),Image.NEAREST),(20+c*W*SC,10+r*W*SC),im.resize((W*SC,H*SC),Image.NEAREST))
    sheet.save('sheet_a.png'); print(sheet.size)
    json.dump({'slots':SLOTS,'pal':PAL,'data':data,'eyes':eyes},open('duck_a.json','w'))
