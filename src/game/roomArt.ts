import { TILE_SIZE, ROOM_WIDTH, CANVAS_WIDTH, CANVAS_HEIGHT, TILE_DOOR, ART_SCALE, ART_PIXEL } from './constants';
import type { FloorTheme } from './constants';

const T = TILE_SIZE;

function hash(x: number, y: number, s = 0) {
  return Math.abs((x * 73 + y * 37 + s * 19) * 2654435761) >>> 0;
}

const artSnap=(v:number)=>Math.round(v*ART_SCALE)/ART_SCALE;
const artSpan=(v:number)=>Math.max(ART_PIXEL,Math.round(v*ART_SCALE)/ART_SCALE);
function r(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color; ctx.fillRect(artSnap(x), artSnap(y), artSpan(w), artSpan(h));
}

function floorTierFromDeco(deco:string){
  return deco==='lobby'?0:deco==='security'?1:deco==='storage'?2:deco==='bakery'?3:deco==='vault'?4:5;
}

function decoMetal(deco:string){
  return deco==='security'?'#a99369':
    deco==='storage'?'#b38c55':
    deco==='bakery'?'#c99c55':
    deco==='vault'?'#dfb83f':
    deco==='golden'?'#f2ca4c':
    '#9f8555';
}

function decoVein(deco:string){
  return deco==='security'?'rgba(235,229,214,.10)':
    deco==='storage'?'rgba(223,208,184,.12)':
    deco==='bakery'?'rgba(247,237,215,.18)':
    deco==='vault'?'rgba(235,201,92,.16)':
    deco==='golden'?'rgba(142,224,255,.18)':
    'rgba(111,105,94,.10)';
}

function drawMarbleVein(ctx:CanvasRenderingContext2D,px:number,py:number,h:number,color:string,strong=.12){
  ctx.save();ctx.globalAlpha=strong;ctx.strokeStyle=color;ctx.lineWidth=.75;
  const bend=(h%7)-3;
  ctx.beginPath();
  ctx.moveTo(px+2,py+7+(h%5));
  ctx.lineTo(px+10,py+10+bend);
  ctx.lineTo(px+18,py+7+(h%9));
  ctx.lineTo(px+30,py+13+(h%6));
  ctx.stroke();
  if(h%3===0){
    ctx.globalAlpha=strong*.55;ctx.beginPath();
    ctx.moveTo(px+8,py+25);ctx.lineTo(px+15,py+20);ctx.lineTo(px+28,py+23);ctx.stroke();
  }
  ctx.restore();
}

function drawLuxuryFloorDetail(
  ctx:CanvasRenderingContext2D,px:number,py:number,h:number,theme:FloorTheme,frame:number,
){
  const tier=floorTierFromDeco(theme.deco),metal=decoMetal(theme.deco),variant=h%7;

  if(tier===0){
    // Entrada: losas grandes de piedra clara y juntas limpias.
    if(variant===0||variant===4) drawMarbleVein(ctx,px,py,h,'#7f7a70',.10);
    ctx.globalAlpha=.22;r(ctx,px+3,py+3,T-6,1,'#f3eee1');ctx.globalAlpha=1;
    if(h%5===0){ctx.globalAlpha=.34;r(ctx,px+25,py+25,2,2,metal);ctx.globalAlpha=1;}
  }else if(tier===1){
    // Administración: piedra/terrazzo con inserto champagne y notas de roble.
    if(variant<3){
      ctx.globalAlpha=.11;
      for(const [ox,oy] of [[7,8],[18,6],[12,18],[24,22]] as const)r(ctx,px+ox,py+oy,2,1,(ox+oy+h)%2?'#d8d2c5':'#6f6c66');
      ctx.globalAlpha=1;
    }
    if(h%4===0){ctx.globalAlpha=.25;r(ctx,px+5,py+25,22,1,metal);ctx.globalAlpha=1;}
  }else if(tier===2){
    // Ejecutivos: piedra humo con marcos de nogal.
    if(variant%2===0){ctx.globalAlpha=.18;r(ctx,px+3,py+3,2,T-6,'#42362f');r(ctx,px+27,py+3,2,T-6,'#42362f');ctx.globalAlpha=1;}
    drawMarbleVein(ctx,px,py,h,'#d7cab6',.09);
    if(h%5===0){ctx.globalAlpha=.28;r(ctx,px+9,py+26,14,1,metal);ctx.globalAlpha=1;}
  }else if(tier===3){
    // Alta dirección: mármol crema pulido, vetas y latón.
    drawMarbleVein(ctx,px,py,h,'#f5ead6',.18);
    if(variant===0||variant===3){
      ctx.globalAlpha=.42;r(ctx,px+3,py+3,T-6,1,metal);r(ctx,px+3,py+28,T-6,1,metal);ctx.globalAlpha=1;
    }
    if(h%6===0){ctx.globalAlpha=.10;r(ctx,px+6,py+6,20,20,'#ffffff');ctx.globalAlpha=1;}
  }else if(tier===4){
    // Tesorería: mármol oscuro con incrustaciones de oro.
    drawMarbleVein(ctx,px,py,h,'#d9c16b',.15);
    if(variant<=2){
      ctx.globalAlpha=.48;r(ctx,px+3,py+3,T-6,1,metal);r(ctx,px+3,py+28,T-6,1,metal);
      if(variant===0){r(ctx,px+15,py+4,2,24,metal);}
      ctx.globalAlpha=1;
    }
    if(h%5===0){ctx.globalAlpha=.24;ctx.fillStyle='#f3d86f';ctx.fillRect(px+6,py+7,2,1);ctx.fillRect(px+24,py+21,1,1);ctx.globalAlpha=1;}
  }else{
    // Cámara soberana: ónix, oro y destellos diamante.
    drawMarbleVein(ctx,px,py,h,'#708399',.16);
    if(variant<=3){
      ctx.globalAlpha=.52;r(ctx,px+3,py+3,T-6,1,metal);r(ctx,px+3,py+28,T-6,1,metal);
      if(variant===0||variant===2){r(ctx,px+4,py+15,24,2,metal);}
      ctx.globalAlpha=1;
    }
    const shimmer=.38+.22*Math.sin(frame*.055+h);
    ctx.globalAlpha=shimmer;
    for(const [ox,oy] of [[7,8],[22,6],[13,23],[25,19]] as const){
      ctx.fillStyle=(ox+oy+h)%2?'#d7f8ff':'#82d8f5';ctx.fillRect(px+ox,py+oy,1+(h%3===0?1:0),1);
    }
    ctx.globalAlpha=1;
  }
}

function drawWallPanelBase(ctx:CanvasRenderingContext2D,px:number,py:number,theme:FloorTheme,h:number){
  const tier=floorTierFromDeco(theme.deco),metal=decoMetal(theme.deco);
  r(ctx,px,py,T,T,tier>=4?'#07090b':'rgba(28,24,21,.40)');
  r(ctx,px+1,py+1,T-2,T-2,theme.wall[(h+Math.floor(px/T)+Math.floor(py/T))%2]);

  if(tier===0){
    r(ctx,px+2,py+2,T-4,3,'rgba(255,255,255,.22)');
    r(ctx,px+3,py+24,T-6,6,'#8e877c');
    r(ctx,px+3,py+23,T-6,1,metal);
    if(h%3===0){r(ctx,px+5,py+6,T-10,15,'rgba(255,255,255,.08)');}
  }else if(tier===1){
    // panel administrativo + listones de roble
    r(ctx,px+3,py+4,T-6,20,'rgba(255,255,255,.045)');
    if(h%3===0){
      for(let xx=px+6;xx<px+28;xx+=5)r(ctx,xx,py+5,3,19,'#756657');
    }else{r(ctx,px+4,py+23,T-8,5,'#6d645a');}
    r(ctx,px+3,py+3,T-6,1,metal);
  }else if(tier===2){
    // nogal ejecutivo.
    r(ctx,px+3,py+4,T-6,22,'#4b4037');
    for(let xx=px+6;xx<px+29;xx+=6)r(ctx,xx,py+5,1,20,'rgba(212,176,125,.10)');
    r(ctx,px+3,py+3,T-6,1,metal);r(ctx,px+3,py+26,T-6,2,'#332c27');
  }else if(tier===3){
    // mármol + nogal oscuro + latón.
    r(ctx,px+3,py+3,T-6,8,'#a69d90');
    drawMarbleVein(ctx,px+1,py,h,'#eee1ca',.16);
    r(ctx,px+4,py+12,T-8,15,'#463a31');
    r(ctx,px+3,py+11,T-6,1,metal);r(ctx,px+3,py+27,T-6,1,metal);
  }else if(tier===4){
    // tesorería: piedra negra y marcos de oro.
    r(ctx,px+3,py+3,T-6,T-6,'#292a27');
    r(ctx,px+5,py+5,T-10,T-10,'#393832');
    ctx.globalAlpha=.68;r(ctx,px+4,py+4,T-8,1,metal);r(ctx,px+4,py+27,T-8,1,metal);
    r(ctx,px+4,py+5,1,22,metal);r(ctx,px+27,py+5,1,22,metal);ctx.globalAlpha=1;
  }else{
    // cámara soberana: ónix, oro y filete diamante.
    r(ctx,px+2,py+2,T-4,T-4,'#14171c');
    r(ctx,px+5,py+5,T-10,T-10,'#242832');
    ctx.globalAlpha=.80;r(ctx,px+3,py+3,T-6,1,metal);r(ctx,px+3,py+28,T-6,1,metal);
    r(ctx,px+3,py+4,1,24,metal);r(ctx,px+28,py+4,1,24,metal);ctx.globalAlpha=1;
    ctx.globalAlpha=.38;r(ctx,px+6,py+7,20,1,'#9deaff');r(ctx,px+6,py+24,20,1,'#6acff1');ctx.globalAlpha=1;
  }
}

function drawHazardBand(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,accent:string,vertical=false){
  r(ctx,x,y,w,h,'#17191a');
  ctx.save();ctx.globalAlpha=.82;ctx.fillStyle=accent;
  const step=7;
  if(vertical){
    for(let yy=y-4;yy<y+h+4;yy+=step){
      ctx.beginPath();ctx.moveTo(x,yy+4);ctx.lineTo(x+w,yy);ctx.lineTo(x+w,yy+3);ctx.lineTo(x,yy+7);ctx.closePath();ctx.fill();
    }
  }else{
    for(let xx=x-4;xx<x+w+4;xx+=step){
      ctx.beginPath();ctx.moveTo(xx,y+h);ctx.lineTo(xx+4,y);ctx.lineTo(xx+7,y);ctx.lineTo(xx+3,y+h);ctx.closePath();ctx.fill();
    }
  }
  ctx.restore();
}

export function drawRichTile(
  ctx: CanvasRenderingContext2D, x: number, y: number, wall: boolean,
  theme: FloorTheme, gx: number, gy: number, frame: number,
  wallProps = true,
) {
  const px=x*T,py=y*T;
  const h=hash(x+gx*ROOM_WIDTH,y+gy*11,theme.deco.charCodeAt(0));
  const tier=floorTierFromDeco(theme.deco),metal=decoMetal(theme.deco);

  if(wall){
    drawWallPanelBase(ctx,px,py,theme,h);
    // Juntas arquitectónicas: cada piso gana más precisión y metales nobles.
    if(x%2===0){
      ctx.globalAlpha=tier>=3?.55:.20;r(ctx,px+1,py+3,tier>=4?2:1,T-6,metal);ctx.globalAlpha=1;
    }
    if(tier>=3&&h%5===0){
      ctx.globalAlpha=.16;r(ctx,px+7,py+7,18,14,'#ffffff');ctx.globalAlpha=1;
    }
    if(wallProps)drawWallProp(ctx,px,py,theme.deco,h,frame,y===0,x===0||x===ROOM_WIDTH-1);
    return;
  }

  // Cada piso usa un material reconocible: piedra -> oficina -> nogal/piedra ->
  // mármol ejecutivo -> mármol con oro -> ónix con oro/diamante.
  const macro=((Math.floor(x/2)+Math.floor(y/2))&1);
  r(ctx,px,py,T,T,macro?theme.floor[1]:theme.floor[0]);

  const seam=tier<=1?1:tier<=3?1.25:1.5;
  ctx.globalAlpha=.34;
  r(ctx,px,py,seam,T,theme.floor[2]);r(ctx,px,py,T,seam,theme.floor[2]);
  ctx.globalAlpha=1;

  // Baldosas más grandes en pisos caros.
  if(tier>=3){
    if(x%2===0){ctx.globalAlpha=.22;r(ctx,px+1,py,1,T,metal);ctx.globalAlpha=1;}
    if(y%2===0){ctx.globalAlpha=.22;r(ctx,px,py+1,T,1,metal);ctx.globalAlpha=1;}
  }

  r(ctx,px+2,py+2,T-4,1,tier>=4?'rgba(255,255,255,.065)':'rgba(255,255,255,.09)');
  r(ctx,px+2,py+T-3,T-4,1,'rgba(0,0,0,.12)');
  drawLuxuryFloorDetail(ctx,px,py,h,theme,frame);

  // Inlays que crecen en riqueza conforme subes.
  if(tier===0&&x%4===0&&y%3===0){
    ctx.globalAlpha=.13;r(ctx,px+5,py+26,22,1,metal);ctx.globalAlpha=1;
  }else if(tier===1&&(x+y)%5===0){
    ctx.globalAlpha=.17;r(ctx,px+5,py+5,1,22,metal);ctx.globalAlpha=1;
  }else if(tier===2&&h%4===0){
    ctx.globalAlpha=.20;r(ctx,px+4,py+26,24,1,metal);ctx.globalAlpha=1;
  }else if(tier===3&&h%3===0){
    ctx.globalAlpha=.28;r(ctx,px+4,py+4,24,1,metal);r(ctx,px+4,py+27,24,1,metal);ctx.globalAlpha=1;
  }else if(tier===4&&h%2===0){
    ctx.globalAlpha=.38;r(ctx,px+3,py+15,26,2,metal);ctx.globalAlpha=1;
  }else if(tier===5){
    ctx.globalAlpha=.38;
    if(h%2===0)r(ctx,px+3,py+15,26,2,metal);
    if(h%3===0)r(ctx,px+15,py+3,2,26,'#8ddff5');
    ctx.globalAlpha=1;
  }
}

function drawGalleryPainting(
  ctx:CanvasRenderingContext2D,px:number,py:number,frameColor:string,seed:number,large=false,diamond=false,
){
  const w=large?38:24,h=large?20:16,x=px+(32-w)/2,y=py+(large?5:8);
  r(ctx,x-2,y-2,w+4,h+4,'#17120d');
  r(ctx,x-1,y-1,w+2,h+2,frameColor);
  r(ctx,x,y,w,h,'#221d19');
  const palettes=[
    ['#213746','#b68555','#d7c7a8'],
    ['#4b2731','#b6a064','#d9d0bb'],
    ['#26392d','#947447','#c8bca6'],
    ['#3b354c','#c09c58','#d9c7a5'],
  ];
  const p=palettes[seed%palettes.length];
  // Pintura original tipo museo: horizonte, arquitectura/figura abstracta.
  r(ctx,x+2,y+2,w-4,h-4,p[0]);
  r(ctx,x+2,y+Math.floor(h*.58),w-4,Math.ceil(h*.38),p[1]);
  ctx.fillStyle=p[2];ctx.globalAlpha=.76;
  ctx.beginPath();ctx.ellipse(x+w*.62,y+h*.42,large?5:3,large?6:4,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.35;r(ctx,x+3,y+3,Math.max(5,w*.35),1,'#f7ead3');
  if(diamond){
    ctx.globalAlpha=.9;
    for(const [ox,oy] of [[0,0],[w+1,0],[0,h+1],[w+1,h+1]] as const){
      ctx.fillStyle='#b8f3ff';ctx.fillRect(x-1+ox,y-1+oy,2,2);
    }
  }
  ctx.globalAlpha=1;
}

function drawWallProp(ctx: CanvasRenderingContext2D, px: number, py: number, deco: string, h: number, f: number, north: boolean, side: boolean) {
  if(!north&&!side&&h%4!==0)return;
  const tier=floorTierFromDeco(deco),seed=h%8,metal=decoMetal(deco),pulse=.5+.5*Math.sin(f*.06+h);

  if(tier===0){
    if(seed===0||seed===5){ // señalización bancaria / reloj elegante
      r(ctx,px+6,py+8,20,13,'#eee8dc');r(ctx,px+7,py+9,18,11,'#c9c0af');
      ctx.globalAlpha=.75;r(ctx,px+9,py+11,14,2,metal);r(ctx,px+11,py+15,10,1,'#6f6b63');ctx.globalAlpha=1;
    }else if(seed===1||seed===6){
      drawGalleryPainting(ctx,px,py,'#8d744b',seed,false,false);
    }else if(seed===2){ // aplique cálido
      r(ctx,px+13,py+6,6,18,'#756b5f');
      ctx.globalAlpha=.72+.15*pulse;r(ctx,px+14,py+8,4,14,'#f2d8a5');ctx.globalAlpha=1;
    }else{
      r(ctx,px+6,py+9,20,12,'rgba(255,255,255,.10)');r(ctx,px+7,py+20,18,2,metal);
    }
  }else if(tier===1){
    if(seed%4===0) drawGalleryPainting(ctx,px,py,'#a99369',seed,false,false);
    else if(seed%4===1){ // certificados/panel de oficina
      r(ctx,px+7,py+7,18,18,'#5f584f');r(ctx,px+9,py+9,14,14,'#d4cec2');
      r(ctx,px+11,py+12,10,1,'#8b8175');r(ctx,px+11,py+15,7,1,'#8b8175');r(ctx,px+15,py+19,4,2,metal);
    }else if(seed%4===2){ // vidrio esmerilado
      r(ctx,px+6,py+6,20,18,'rgba(210,220,220,.16)');ctx.globalAlpha=.30;r(ctx,px+9,py+8,1,14,metal);r(ctx,px+16,py+8,1,14,metal);ctx.globalAlpha=1;
    }else{
      r(ctx,px+8,py+8,16,14,'#3e3934');for(let yy=py+10;yy<py+21;yy+=3)r(ctx,px+10,yy,12,1,'#8f806f');
    }
  }else if(tier===2){
    if(seed%3===0) drawGalleryPainting(ctx,px,py,'#b38c55',seed,seed%6===0,false);
    else if(seed%3===1){ // librero/nogal
      r(ctx,px+5,py+5,22,20,'#3d332c');
      for(let yy=py+8;yy<py+24;yy+=5){r(ctx,px+7,yy,18,1,metal);for(let xx=px+8;xx<px+24;xx+=4)r(ctx,xx,yy-3,2,3,(xx+yy)%3?'#6d4939':'#8a7455');}
    }else{ // aplique de bronce
      r(ctx,px+14,py+5,4,18,metal);ctx.globalAlpha=.55+.2*pulse;r(ctx,px+11,py+8,10,7,'#e7c88d');ctx.globalAlpha=1;
    }
  }else if(tier===3){
    if(seed%3===0||seed===5) drawGalleryPainting(ctx,px,py,'#d2a550',seed,true,false);
    else if(seed%3===1){ // panel de mármol
      r(ctx,px+5,py+5,22,20,'#a69c8d');drawMarbleVein(ctx,px,py,h,'#f2e3ca',.20);r(ctx,px+5,py+4,22,1,metal);
    }else{ // sconce de latón
      r(ctx,px+15,py+5,2,19,metal);r(ctx,px+11,py+9,10,3,'#dfc187');
      ctx.globalAlpha=.35+.2*pulse;r(ctx,px+8,py+11,16,9,'#f3deb2');ctx.globalAlpha=1;
    }
  }else if(tier===4){
    if(seed%3===0) drawGalleryPainting(ctx,px,py,'#e0b842',seed,true,false);
    else if(seed%3===1){ // relieve de oro
      r(ctx,px+6,py+6,20,18,'#171816');r(ctx,px+7,py+7,18,16,'#3d3929');
      ctx.globalAlpha=.78;ctx.strokeStyle=metal;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(px+16,py+15,7,5,0,0,Math.PI*2);ctx.stroke();
      r(ctx,px+15,py+11,2,8,metal);r(ctx,px+12,py+14,8,2,metal);ctx.globalAlpha=1;
    }else{ // nicho iluminado
      r(ctx,px+7,py+6,18,18,'#10110f');r(ctx,px+9,py+8,14,14,'#24231c');
      ctx.globalAlpha=.45+.2*pulse;r(ctx,px+10,py+9,12,1,'#f0d36b');r(ctx,px+15,py+12,2,7,metal);ctx.globalAlpha=1;
    }
  }else{
    if(seed%3===0||seed===5) drawGalleryPainting(ctx,px,py,'#f0c84e',seed,true,true);
    else if(seed%3===1){ // vitrina de gema de pared
      r(ctx,px+6,py+5,20,20,'#090b0f');r(ctx,px+8,py+7,16,16,'#17212b');
      ctx.fillStyle='#aef1ff';ctx.globalAlpha=.88+.10*pulse;ctx.beginPath();
      ctx.moveTo(px+16,py+9);ctx.lineTo(px+21,py+15);ctx.lineTo(px+16,py+22);ctx.lineTo(px+11,py+15);ctx.closePath();ctx.fill();
      ctx.globalAlpha=.65;r(ctx,px+15,py+10,2,10,'#e8fdff');ctx.globalAlpha=1;
    }else{ // escudo/monograma de oro y diamante
      r(ctx,px+7,py+6,18,19,'#17191e');ctx.strokeStyle=metal;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(px+16,py+8);ctx.lineTo(px+22,py+12);ctx.lineTo(px+20,py+20);ctx.lineTo(px+16,py+23);ctx.lineTo(px+12,py+20);ctx.lineTo(px+10,py+12);ctx.closePath();ctx.stroke();
      ctx.globalAlpha=.9;r(ctx,px+15,py+13,3,4,'#aef1ff');ctx.globalAlpha=1;
    }
  }
}

export function drawRoomAtmosphere(ctx: CanvasRenderingContext2D, deco: string, frame: number, special = false) {
  const accent=decoMetal(deco);
  const baseLights=deco==='lobby'?[[120,48],[360,48]]:
    deco==='security'?[[80,42],[240,38],[400,42]]:
    deco==='bakery'?[[100,48],[380,48]]:
    deco==='vault'?[[160,42],[320,42]]:
    deco==='golden'?[[150,42],[330,42]]:
    [[140,48],[340,48]];
  const lights=baseLights.map(([x,y])=>[x/480*CANVAS_WIDTH,y] as [number,number]);

  // Iluminación arquitectónica: luminarias de pared que bañan piedra y metal.
  for(const [lx,ly] of lights){
    const g=ctx.createRadialGradient(lx,ly,3,lx,ly+44,108);
    const col=deco==='bakery'?'226,164,111':
      deco==='golden'?'255,229,154':
      deco==='vault'?'230,208,131':
      deco==='security'?'116,183,208':
      deco==='storage'?'217,196,157':
      '216,229,228';
    const base=deco==='golden'?.22:deco==='lobby'?.18:.16;
    g.addColorStop(0,'rgba('+col+','+(base+.025*Math.sin(frame*.035+lx))+')');
    g.addColorStop(.38,'rgba('+col+','+(base*.42)+')');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(lx-108,ly-12,216,174);

    // Luminaria física empotrada en el muro.
    ctx.globalAlpha=.55;ctx.fillStyle=accent;ctx.fillRect(lx-9,38,18,2);
    ctx.globalAlpha=.18;ctx.fillStyle='#fff8dd';ctx.fillRect(lx-5,40,10,2);
    ctx.globalAlpha=1;

    // El baño de pared ahora alcanza el mármol como una huella elíptica.
    // Se mantiene extremadamente tenue para no competir con balas, loot o telegraphs.
    ctx.save();
    ctx.translate(lx,216);ctx.scale(1,.28);
    const floorPool=ctx.createRadialGradient(0,0,4,0,0,74);
    floorPool.addColorStop(0,'rgba(255,245,214,.055)');
    floorPool.addColorStop(.42,'rgba(255,245,214,.022)');
    floorPool.addColorStop(1,'rgba(255,245,214,0)');
    ctx.fillStyle=floorPool;ctx.beginPath();ctx.arc(0,0,74,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  ctx.save();
  // Marco interior continuo: incrustación que hace que la sala se lea como
  // una estancia bancaria diseñada, no como un conjunto de tiles.
  ctx.globalAlpha=deco==='golden'?.20:.11;
  ctx.strokeStyle=accent;ctx.lineWidth=1;
  ctx.strokeRect(43.5,43.5,CANVAS_WIDTH-87,CANVAS_HEIGHT-87);
  ctx.globalAlpha=deco==='golden'?.10:.055;
  ctx.strokeRect(49.5,49.5,CANVAS_WIDTH-99,CANVAS_HEIGHT-99);

  // Marcas de sector integradas en las cuatro esquinas: arquitectura, no HUD.
  // Cada ala del banco conserva su metal propio y gana una firma reconocible.
  ctx.globalAlpha=.20;ctx.strokeStyle=accent;ctx.lineWidth=1;
  const inset=58,len=13;
  for(const [sx,sy,dx,dy] of [
    [inset,inset,1,1],[CANVAS_WIDTH-inset,inset,-1,1],
    [inset,CANVAS_HEIGHT-inset,1,-1],[CANVAS_WIDTH-inset,CANVAS_HEIGHT-inset,-1,-1],
  ] as const){
    ctx.beginPath();ctx.moveTo(sx+dx*len,sy);ctx.lineTo(sx,sy);ctx.lineTo(sx,sy+dy*len);ctx.stroke();
    ctx.globalAlpha=.08;ctx.fillStyle=accent;ctx.fillRect(sx+dx*4-(dx<0?4:0),sy+dy*4-(dy<0?4:0),4,4);ctx.globalAlpha=.20;
  }

  // Eje central pulido/incrustado según sector.
  if(deco==='lobby'){
    ctx.globalAlpha=.09;ctx.fillStyle=accent;
    ctx.fillRect(CANVAS_WIDTH/2-1,48,2,CANVAS_HEIGHT-96);
    ctx.fillRect(48,CANVAS_HEIGHT/2-1,CANVAS_WIDTH-96,2);
    ctx.globalAlpha=.06;ctx.strokeStyle='#dce7e4';ctx.strokeRect(62.5,57.5,CANVAS_WIDTH-125,CANVAS_HEIGHT-115);
  }else if(deco==='security'){
    const scan=52+(frame*.38)%(CANVAS_HEIGHT-104);
    ctx.globalAlpha=.055;ctx.fillStyle='#74b7d0';ctx.fillRect(46,scan,CANVAS_WIDTH-92,1);
    ctx.globalAlpha=.028;ctx.fillRect(46,scan-4,CANVAS_WIDTH-92,9);
    ctx.globalAlpha=.075;ctx.fillStyle='#ba554d';
    for(const x of [70,CANVAS_WIDTH-74])if(((frame+Math.floor(x))>>4)%2===0)ctx.fillRect(x,47,3,2);
  }else if(deco==='storage'){
    // Archivo de valores: líneas de bronce y zonas de circulación limpias.
    ctx.globalAlpha=.075;ctx.fillStyle=accent;
    for(let x=72;x<CANVAS_WIDTH-64;x+=112)ctx.fillRect(x,54,1,CANVAS_HEIGHT-108);
    ctx.globalAlpha=.035;ctx.fillStyle='#050708';
    for(let y=88;y<CANVAS_HEIGHT-64;y+=76)ctx.fillRect(54,y,CANVAS_WIDTH-108,2);
  }else if(deco==='bakery'){
    // Servicios privados: calor contenido en líneas de cobre, sin suciedad visual.
    const heat=.045+.014*Math.sin(frame*.05);
    ctx.globalAlpha=heat;ctx.fillStyle=accent;
    ctx.fillRect(42,50,3,CANVAS_HEIGHT-100);ctx.fillRect(CANVAS_WIDTH-45,50,3,CANVAS_HEIGHT-100);
    ctx.globalAlpha=.032;ctx.fillStyle='#f0c39a';
    for(let y=78;y<CANVAS_HEIGHT-62;y+=58)ctx.fillRect(58,y,CANVAS_WIDTH-116,1);
  }else if(deco==='vault'){
    ctx.globalAlpha=.075;ctx.strokeStyle=accent;
    for(let i=0;i<3;i++)ctx.strokeRect(54+i*16+.5,51+i*11+.5,CANVAS_WIDTH-109-i*32,CANVAS_HEIGHT-103-i*22);
    ctx.globalAlpha=.035;ctx.fillStyle='#d7ddd8';
    for(let x=74;x<CANVAS_WIDTH-68;x+=64)ctx.fillRect(x,54,1,CANVAS_HEIGHT-108);
  }else if(deco==='golden'){
    // Cámara principal: geometría simétrica y reflejos de oro muy controlados.
    const shimmer=.06+.022*Math.sin(frame*.045);
    ctx.globalAlpha=shimmer;ctx.strokeStyle=accent;
    ctx.strokeRect(52.5,50.5,CANVAS_WIDTH-105,CANVAS_HEIGHT-101);
    ctx.strokeRect(68.5,63.5,CANVAS_WIDTH-137,CANVAS_HEIGHT-127);
    ctx.globalAlpha=.045;ctx.fillStyle='#ffe59a';
    ctx.fillRect(CANVAS_WIDTH/2-1,52,2,CANVAS_HEIGHT-104);
    for(let i=0;i<6;i++){
      const x=78+(i*79)%Math.max(90,CANVAS_WIDTH-156),y=72+((i*41+Math.floor(frame*.1))%(CANVAS_HEIGHT-144));
      ctx.fillRect(x,y,i%2?1:2,1);
    }
  }
  // Infraestructura perimetral visible: canaletas, balizas y luces de piso.
  // Esto da la lectura industrial de la referencia sin invadir la zona de combate.
  ctx.globalAlpha=.34;ctx.fillStyle='#071014';
  ctx.fillRect(42,48,5,CANVAS_HEIGHT-96);
  ctx.fillRect(CANVAS_WIDTH-47,48,5,CANVAS_HEIGHT-96);
  ctx.fillRect(48,42,CANVAS_WIDTH-96,5);
  ctx.fillRect(48,CANVAS_HEIGHT-47,CANVAS_WIDTH-96,5);

  // Balizas laterales cálidas/cian según sector.
  const sideGlow=deco==='security'?'#5ad2f2':
    deco==='bakery'?'#f0a15b':
    deco==='storage'?'#d5ad68':
    deco==='vault'||deco==='golden'?'#f0c65a':'#edc35c';
  for(const yy of [92,176,260]){
    ctx.globalAlpha=.18;ctx.fillStyle=sideGlow;
    ctx.fillRect(43,yy-11,3,22);ctx.fillRect(CANVAS_WIDTH-46,yy-11,3,22);
    ctx.globalAlpha=.68;ctx.fillRect(44,yy-7,1,14);ctx.fillRect(CANVAS_WIDTH-45,yy-7,1,14);
  }

  // Carriles luminosos empotrados: cortos y horizontales para no parecer flechas.
  ctx.globalAlpha=.16+.04*Math.sin(frame*.045);ctx.fillStyle=sideGlow;
  for(const x of [86,170,254,338]){
    ctx.fillRect(x,55,26,2);
    ctx.fillRect(x,CANVAS_HEIGHT-57,26,2);
  }
  ctx.globalAlpha=1;
  ctx.restore();

  // Reflejo central tenue sobre el piso pulido.
  // Un segundo brillo lateral muy fino rompe la simetría perfecta y da
  // profundidad sin introducir decoración que se pueda confundir con pickups.
  ctx.save();
  ctx.globalAlpha=.032;ctx.fillStyle='#ffffff';
  const drift=((frame*.018)%96);
  ctx.fillRect(74+drift,66,1,CANVAS_HEIGHT-132);
  ctx.globalAlpha=.016;ctx.fillRect(CANVAS_WIDTH-92-drift*.55,72,1,CANVAS_HEIGHT-144);
  ctx.restore();

  const reflection=ctx.createLinearGradient(0,62,0,CANVAS_HEIGHT-56);
  reflection.addColorStop(0,'rgba(255,255,255,0)');
  reflection.addColorStop(.48,'rgba(255,255,255,.018)');
  reflection.addColorStop(.55,'rgba(255,255,255,.032)');
  reflection.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=reflection;ctx.fillRect(54,54,CANVAS_WIDTH-108,CANVAS_HEIGHT-108);

  const vignette=ctx.createRadialGradient(CANVAS_WIDTH/2,CANVAS_HEIGHT/2,126,CANVAS_WIDTH/2,CANVAS_HEIGHT/2,Math.max(CANVAS_WIDTH,CANVAS_HEIGHT)*.72);
  vignette.addColorStop(0,'rgba(0,0,0,0)');
  vignette.addColorStop(1,'rgba(1,6,9,.14)');
  ctx.fillStyle=vignette;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);

  if(special){
    const g=ctx.createRadialGradient(CANVAS_WIDTH/2,176,18,CANVAS_WIDTH/2,176,180);
    g.addColorStop(0,'rgba(198,168,102,.10)');
    g.addColorStop(.55,'rgba(86,55,70,.055)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  }
}

export function drawInnerWallShadow(ctx: CanvasRenderingContext2D) {
  // Umbral físico entre muro y sala: zócalo grueso, sombra y filete de luz.
  ctx.fillStyle='rgba(0,0,0,.36)';
  ctx.fillRect(T,T,CANVAS_WIDTH-T*2,7);
  ctx.fillRect(T,T,7,CANVAS_HEIGHT-T*2);
  ctx.fillRect(CANVAS_WIDTH-T-7,T,7,CANVAS_HEIGHT-T*2);
  ctx.fillRect(T,CANVAS_HEIGHT-T-6,CANVAS_WIDTH-T*2,6);

  ctx.fillStyle='rgba(255,255,255,.045)';
  ctx.fillRect(T+7,T+7,CANVAS_WIDTH-T*2-14,1);
  ctx.fillRect(T+7,T+8,1,CANVAS_HEIGHT-T*2-16);
  ctx.fillStyle='rgba(255,190,80,.045)';
  ctx.fillRect(T+12,CANVAS_HEIGHT-T-7,CANVAS_WIDTH-T*2-24,1);

  // Placas de anclaje en esquinas interiores.
  ctx.fillStyle='rgba(6,10,12,.72)';
  for(const [x,y] of [[T+5,T+5],[CANVAS_WIDTH-T-13,T+5],[T+5,CANVAS_HEIGHT-T-13],[CANVAS_WIDTH-T-13,CANVAS_HEIGHT-T-13]] as const){
    ctx.fillRect(x,y,8,8);
    ctx.fillStyle='rgba(214,177,87,.30)';ctx.fillRect(x+2,y+2,2,2);
    ctx.fillStyle='rgba(6,10,12,.72)';
  }
}

export { TILE_DOOR };
